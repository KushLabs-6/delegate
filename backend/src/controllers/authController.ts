import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { notifyWelcome } from '../services/notificationService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-key-12345';

// Register User
export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, fullName, email, password, phone } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        fullName,
        email,
        password: hashedPassword,
        phone,
        // Auto-verify in dev/test, can be mocked
      },
    });

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, isSystemAdmin: user.isSystemAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create system log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        details: `User ${user.username} registered.`,
      },
    });

    // Send welcome confirmation email (fire-and-forget)
    notifyWelcome({ fullName: user.fullName, email: user.email, username: user.username }).catch(() => {});

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        isSystemAdmin: user.isSystemAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

// Login User
export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, isSystemAdmin: user.isSystemAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `User ${user.username} logged in.`,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        isSystemAdmin: user.isSystemAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

// Get Profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      isSystemAdmin: user.isSystemAdmin,
      memberships: user.memberships,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { fullName, phone, username } = req.body;

    // Check username availability if changing
    if (username && username !== req.user.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        phone,
        username,
      },
    });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      isSystemAdmin: updatedUser.isSystemAdmin,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Change Password
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Upload Profile Image
export const uploadProfileImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const profileImage = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage },
    });

    res.json({
      profileImage: user.profileImage,
      message: 'Profile image updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Mock Password Reset Request
export const requestPasswordReset = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    res.json({
      message: 'Password reset link sent (MOCKED). Check server logs or use developer reset.',
      resetToken: jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' }),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Reset Password with token
export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

// Verify Email
export const verifyEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    res.json({ message: 'Email verified successfully (MOCKED)' });
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid verification token' });
  }
};

// Delete Account
export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure the user deleting the account is the account owner or a system admin
    if (req.user.id !== req.user.id && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.user.delete({
      where: { id: req.user.id },
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete account' });
  }
};

export const backfillWelcomeEmails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only system admins can trigger this
    if (!req.user?.isSystemAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await prisma.user.findMany();
    let sentCount = 0;

    for (const user of users) {
      if (user.email === 'admin@delegate.app') continue; // skip system admin
      await notifyWelcome({
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      });
      sentCount++;
      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({ message: `Successfully sent welcome emails to ${sentCount} users.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
