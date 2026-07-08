import { Response } from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Create Business
export const createBusiness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, description, address, website, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user?.subscriptionPlan === 'FREE') {
      const existingTeams = await prisma.business.count({
        where: { ownerId: req.user.id },
      });
      if (existingTeams >= 1) {
        return res.status(403).json({ error: 'Free tier is limited to 1 team. Please upgrade to Premium to create more teams.' });
      }
    }

    const business = await prisma.business.create({
      data: {
        name,
        description,
        address,
        website,
        phone,
        inviteCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
        ownerId: req.user.id,
      },
    });

    // Create BusinessMember record as OWNER
    await prisma.businessMember.create({
      data: {
        userId: req.user.id,
        businessId: business.id,
        role: 'OWNER',
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        businessId: business.id,
        action: 'BUSINESS_CREATED',
        details: `Business ${name} created.`,
      },
    });

    res.status(201).json(business);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get User's Businesses
export const getBusinesses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const memberships = await prisma.businessMember.findMany({
      where: { userId: req.user.id },
      include: {
        business: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    profileImage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const crypto = require('crypto');
    const businesses = await Promise.all(memberships.map(async (m) => {
      let business = m.business;
      if (!business.inviteCode) {
        const newCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        await prisma.business.update({
          where: { id: business.id },
          data: { inviteCode: newCode },
        });
        business.inviteCode = newCode;
      }
      return {
        ...business,
        userRole: m.role,
      };
    }));

    res.json(businesses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Business Details
export const getBusinessDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;

    // Check membership
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this business' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                profileImage: true,
                dateJoined: true,
              },
            },
          },
        },
        groups: true,
        jobs: true,
      },
    });

    if (!business) return res.status(404).json({ error: 'Business not found' });

    if (!business.inviteCode) {
      const crypto = require('crypto');
      const newCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      await prisma.business.update({
        where: { id: business.id },
        data: { inviteCode: newCode },
      });
      business.inviteCode = newCode;
    }

    res.json({
      ...business,
      userRole: membership.role,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Business details (Owner/Admin)
export const updateBusiness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    const { name, description, address, website, phone } = req.body;

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name,
        description,
        address,
        website,
        phone,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Business (Owner only)
export const deleteBusiness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) return res.status(404).json({ error: 'Business not found' });

    if (business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the business owner can delete the business' });
    }

    await prisma.business.delete({
      where: { id: businessId },
    });

    res.json({ message: 'Business deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Invite/Add Member to Business (Owner/Admin/Manager)
export const inviteMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;
    const { emailOrUsername, role } = req.body; // role: ADMIN, MANAGER, SUPERVISOR, EMPLOYEE, GUEST

    if (!emailOrUsername || !role) {
      return res.status(400).json({ error: 'Email/Username and role are required' });
    }

    // Find the user to invite
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    // Check if user is already a member
    const existingMember = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: targetUser.id,
          businessId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this business' });
    }

    // Create membership
    const member = await prisma.businessMember.create({
      data: {
        userId: targetUser.id,
        businessId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: 'Added to Business',
        description: `You have been added to ${member.businessId} as an ${role}.`,
        type: 'INVITE',
        link: `/businesses/${businessId}`,
      },
    });

    res.status(201).json(member);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Manage Member Role (Owner/Admin)
export const manageMemberRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot change ownership role through this endpoint' });
    }

    const updated = await prisma.businessMember.update({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      data: { role },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Remove Member (Owner/Admin/Self)
export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;
    const { userId } = req.body;

    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove owner. Transfer ownership first.' });
    }

    await prisma.businessMember.delete({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });

    // Also remove from any groups in this business
    const groups = await prisma.teamGroup.findMany({ where: { businessId } });
    const groupIds = groups.map(g => g.id);

    await prisma.groupMember.deleteMany({
      where: {
        userId,
        groupId: { in: groupIds },
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create Team Group
export const createTeamGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;
    const { name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Generate unique code for QR/Join links
    const inviteCode = crypto.randomBytes(6).toString('hex').toLowerCase();

    const group = await prisma.teamGroup.create({
      data: {
        businessId,
        name,
        description,
        isPrivate: isPrivate === 'true' || isPrivate === true,
        inviteCode,
      },
    });

    // Add creator to group membership
    await prisma.groupMember.create({
      data: {
        userId: req.user.id,
        groupId: group.id,
      },
    });

    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Groups in Business
export const getGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    const groups = await prisma.teamGroup.findMany({
      where: { businessId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Group Details (with messages)
export const getGroupDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { groupId } = req.params;

    const group = await prisma.teamGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Verify user is in group or business
    const isMember = group.members.some(m => m.userId === req!.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    res.json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Join Group by Invite Code
export const joinGroupByCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const group = await prisma.teamGroup.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if user is business member
    let isBusinessMember = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId: group.businessId,
        },
      },
    });

    // If not a business member, add them as GUEST/EMPLOYEE
    if (!isBusinessMember) {
      isBusinessMember = await prisma.businessMember.create({
        data: {
          userId: req.user.id,
          businessId: group.businessId,
          role: 'EMPLOYEE',
        },
      });
    }

    // Add user to Group
    const existingGroupMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.id,
          groupId: group.id,
        },
      },
    });

    if (existingGroupMembership) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    const groupMember = await prisma.groupMember.create({
      data: {
        userId: req.user.id,
        groupId: group.id,
      },
    });

    res.status(201).json({
      message: 'Successfully joined group',
      group,
      groupMember,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Leave Group
export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { groupId } = req.params;

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: req.user.id,
          groupId,
        },
      },
    });

    res.json({ message: 'Successfully left the group' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Generate QR Code URL for Invites
export const getInviteQRCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { inviteCode } = req.params;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const joinUrl = `${clientUrl}/join/${inviteCode}`;

    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);
    res.json({ qrCodeDataUrl, joinUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Join Business by ID or Invite Code
export const joinBusinessByCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { codeOrId } = req.body;

    if (!codeOrId) {
      return res.status(400).json({ error: 'Invite code or ID is required' });
    }

    const business = await prisma.business.findFirst({
      where: {
        OR: [
          { id: codeOrId },
          { inviteCode: codeOrId }
        ]
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is already a member
    const existing = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId: business.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You are already a member of this team' });
    }

    const membership = await prisma.businessMember.create({
      data: {
        userId: req.user.id,
        businessId: business.id,
        role: 'EMPLOYEE',
      },
    });

    res.status(201).json({
      message: 'Successfully joined team',
      business,
      membership,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Cloud Storage Link
export const updateCloudLink = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;
    const { cloudStorageLink } = req.body;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { cloudStorageLink },
    });

    res.json(business);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
