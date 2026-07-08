import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Send Message (Group or Private)
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { recipientId, groupId, content, type, replyToId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    if (!recipientId && !groupId) {
      return res.status(400).json({ error: 'Either recipient ID (private) or group ID (group) must be provided' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        recipientId: recipientId || null,
        groupId: groupId || null,
        content,
        type: type || 'TEXT', // "TEXT", "IMAGE", "VOICE", "FILE"
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
    });

    // Create Notification for private message recipient
    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          title: `New Message from ${req.user.username}`,
          description: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
          type: 'MESSAGE',
          link: `/chats/private/${req.user.id}`,
        },
      });
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Messages (Group Chat or Private Chat)
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { groupId, recipientId } = req.query;

    if (!groupId && !recipientId) {
      return res.status(400).json({ error: 'Query parameter groupId or recipientId is required' });
    }

    let messages;

    if (groupId) {
      // Group Chat messages
      messages = await prisma.message.findMany({
        where: { groupId: groupId as string },
        include: {
          sender: { select: { id: true, username: true, fullName: true, profileImage: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      // Private Chat 1-on-1 messages
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: req.user.id, recipientId: recipientId as string },
            { senderId: recipientId as string, recipientId: req.user.id },
          ],
        },
        include: {
          sender: { select: { id: true, username: true, fullName: true, profileImage: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Pin/Unpin Message
export const togglePinMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { isPinned } = req.body;

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: isPinned === true },
    });

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// React to Message (add/remove emoji reaction)
export const reactToMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { messageId } = req.params;
    const { emoji } = req.body; // e.g., "👍", "❤️"

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji character is required' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Parse existing reactions: { [emoji]: [userIds] }
    let reactionsMap: Record<string, string[]> = {};
    if (message.reactions) {
      try {
        reactionsMap = JSON.parse(message.reactions);
      } catch (e) {
        reactionsMap = {};
      }
    }

    // Toggle reaction
    if (!reactionsMap[emoji]) {
      reactionsMap[emoji] = [];
    }

    const userIndex = reactionsMap[emoji].indexOf(req.user.id);
    if (userIndex > -1) {
      // Remove reaction
      reactionsMap[emoji].splice(userIndex, 1);
      if (reactionsMap[emoji].length === 0) {
        delete reactionsMap[emoji];
      }
    } else {
      // Add reaction
      reactionsMap[emoji].push(req.user.id);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        reactions: JSON.stringify(reactionsMap),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== NOTIFICATIONS CONTROLLERS ====================

// Get Notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Mark Notification Read
export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Mark All Notifications Read
export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Clear Group Chat Messages (for Owner/Admin/Manager)
export const clearGroupMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { groupId } = req.params;

    const group = await prisma.teamGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: req.user.id, businessId: group.businessId }
    });

    if (!membership || !['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only team managers or owners can clear group chats.' });
    }

    await prisma.message.deleteMany({
      where: { groupId }
    });

    res.json({ message: 'Group chat cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
