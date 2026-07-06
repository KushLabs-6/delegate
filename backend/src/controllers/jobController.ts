import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  notifySignupRequested,
  notifySignupApproved,
  notifySignupRejected,
} from '../services/notificationService.js';

// ==================== JOBS CONTROLLERS ====================

// Create Job / Shift (Owner, Admin, Manager)
export const createJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;
    const {
      title, description, priority, location, deadline,
      estimatedTime, notes, attachments,
      startTime, endTime, spotsAvailable, rate
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const job = await prisma.job.create({
      data: {
        businessId,
        title,
        description,
        priority: priority || 'MEDIUM',
        location,
        deadline: deadline ? new Date(deadline) : null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        spotsAvailable: spotsAvailable ? parseInt(spotsAvailable) : null,
        status: 'OPEN',
        estimatedTime,
        notes,
        rate,
        attachments: attachments ? JSON.stringify(attachments) : null,
        creatorId: req.user.id,
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        businessId,
        action: 'JOB_CREATED',
        details: `Shift "${title}" posted.`,
      },
    });

    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Jobs in Business (includes signup counts + current user's signup)
export const getJobs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { businessId } = req.params;

    const jobs = await prisma.job.findMany({
      where: { businessId },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        signups: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, profileImage: true, phone: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, profileImage: true },
            },
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    });

    // Attach computed fields: signupCount, approvedCount, mySignup
    const enriched = jobs.map((job) => {
      const mySignup = job.signups.find((s) => s.userId === req.user!.id) ?? null;
      const approvedCount = job.signups.filter((s) => s.status === 'APPROVED').length;
      const signupCount = job.signups.filter((s) => s.status !== 'CANCELLED').length;
      return { ...job, mySignup, approvedCount, signupCount };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Job Details
export const getJobDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        creator: { select: { id: true, username: true, fullName: true } },
        signups: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, profileImage: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, profileImage: true },
            },
          },
        },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Job (Owner, Admin, Manager)
export const updateJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { jobId } = req.params;
    const {
      title, description, priority, location, deadline, status,
      estimatedTime, notes, attachments, startTime, endTime, spotsAvailable, rate
    } = req.body;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        priority,
        location,
        deadline: deadline ? new Date(deadline) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        spotsAvailable: spotsAvailable !== undefined ? (spotsAvailable ? parseInt(spotsAvailable) : null) : undefined,
        status,
        estimatedTime,
        notes,
        rate,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
        completionDate: status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        businessId: job.businessId,
        action: 'JOB_UPDATED',
        details: `Shift "${job.title}" updated. Status: ${status || job.status}.`,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Job (Owner, Admin, Manager)
export const deleteJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await prisma.job.delete({ where: { id: jobId } });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        businessId: job.businessId,
        action: 'JOB_DELETED',
        details: `Shift "${job.title}" deleted.`,
      },
    });

    res.json({ message: 'Shift deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== SHIFT SIGNUP CONTROLLERS ====================

// Request to Join a Shift (any member)
export const signupForJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { jobId } = req.params;
    const { message } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        signups: true,
        business: { include: { owner: { select: { id: true, fullName: true, email: true, phone: true } } } },
      },
    });

    if (!job) return res.status(404).json({ error: 'Shift not found' });
    if (job.status === 'CLOSED' || job.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This shift is no longer accepting signups' });
    }

    // Check spots
    const approvedCount = job.signups.filter((s) => s.status === 'APPROVED').length;
    if (job.spotsAvailable && approvedCount >= job.spotsAvailable) {
      return res.status(400).json({ error: 'This shift is full' });
    }

    // Check already signed up
    const existing = await prisma.jobSignup.findUnique({
      where: { jobId_userId: { jobId, userId: req.user.id } },
    });

    if (existing) {
      if (existing.status === 'CANCELLED') {
        // Allow re-signup by updating
        const updated = await prisma.jobSignup.update({
          where: { id: existing.id },
          data: { status: 'PENDING', message, reviewedAt: null },
          include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        });
        // Notify business owner
        await notifySignupRequested(job as any, updated.user as any, job.business.owner as any);
        return res.json(updated);
      }
      return res.status(400).json({ error: 'You have already signed up for this shift' });
    }

    const signup = await prisma.jobSignup.create({
      data: { jobId, userId: req.user.id, status: 'PENDING', message },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    // Notify the business owner
    await notifySignupRequested(job as any, signup.user as any, job.business.owner as any);

    res.status(201).json(signup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel My Signup
export const cancelSignup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { jobId } = req.params;

    const signup = await prisma.jobSignup.findUnique({
      where: { jobId_userId: { jobId, userId: req.user.id } },
    });

    if (!signup) return res.status(404).json({ error: 'Signup not found' });

    const updated = await prisma.jobSignup.update({
      where: { id: signup.id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Approve a Signup (Owner, Admin, Manager)
export const approveSignup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { signupId } = req.params;

    const signup = await prisma.jobSignup.findUnique({
      where: { id: signupId },
      include: {
        job: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    if (!signup) return res.status(404).json({ error: 'Signup not found' });

    // Check if spots are still available
    if (signup.job.spotsAvailable) {
      const approvedCount = await prisma.jobSignup.count({
        where: { jobId: signup.jobId, status: 'APPROVED' },
      });
      if (approvedCount >= signup.job.spotsAvailable) {
        return res.status(400).json({ error: 'No spots remaining — shift is full' });
      }
    }

    const updated = await prisma.jobSignup.update({
      where: { id: signupId },
      data: { status: 'APPROVED', reviewedAt: new Date() },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    // Auto-mark shift as FULL if capacity reached
    if (signup.job.spotsAvailable) {
      const newApprovedCount = await prisma.jobSignup.count({
        where: { jobId: signup.jobId, status: 'APPROVED' },
      });
      if (newApprovedCount >= signup.job.spotsAvailable) {
        await prisma.job.update({
          where: { id: signup.jobId },
          data: { status: 'FULL' },
        });
      }
    }

    // Notify the member
    await notifySignupApproved(signup.job as any, updated.user as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Reject a Signup (Owner, Admin, Manager)
export const rejectSignup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { signupId } = req.params;

    const signup = await prisma.jobSignup.findUnique({
      where: { id: signupId },
      include: {
        job: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    if (!signup) return res.status(404).json({ error: 'Signup not found' });

    const updated = await prisma.jobSignup.update({
      where: { id: signupId },
      data: { status: 'REJECTED', reviewedAt: new Date() },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    // Notify the member
    await notifySignupRejected(signup.job as any, updated.user as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get My Schedule (all APPROVED signups across all businesses)
export const getMySchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const signups = await prisma.jobSignup.findMany({
      where: { userId: req.user.id, status: 'APPROVED' },
      include: {
        job: {
          include: {
            business: { select: { id: true, name: true, logo: true } },
          },
        },
      },
      orderBy: { job: { startTime: 'asc' } },
    });

    res.json(signups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== ASSIGNMENTS CONTROLLERS ====================

// Create Assignment (Owner, Admin, Manager, Supervisor)
export const createAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { jobId } = req.params;
    const { title, description, userId, dueDate, priority, checklist, attachments } = req.body;

    if (!title || !userId || !priority) {
      return res.status(400).json({ error: 'Title, Assigned User, and Priority are required' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Parent job not found' });

    const assignment = await prisma.assignment.create({
      data: {
        jobId,
        title,
        description,
        userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'PENDING',
        checklist: checklist ? JSON.stringify(checklist) : null,
        progress: 0,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
      },
    });

    // Create Notification for the assigned user
    if (userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'New Assignment',
          description: `You have been assigned: "${title}" under shift "${job.title}".`,
          type: 'JOB_UPDATE',
          link: `/jobs/${jobId}`,
        },
      });
    }

    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Assignment Details / Checklist / Progress / Status
export const updateAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { assignmentId } = req.params;
    const { title, description, status, checklist, progress, priority, dueDate, attachments } = req.body;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { job: true },
    });

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Validate permission
    const isAssignedUser = assignment.userId === req.user.id;
    let hasRolePermission = false;

    if (!isAssignedUser) {
      const membership = await prisma.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId: req.user.id,
            businessId: assignment.job.businessId,
          },
        },
      });
      if (membership && ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR'].includes(membership.role)) {
        hasRolePermission = true;
      }
    }

    if (!isAssignedUser && !hasRolePermission && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'You do not have permission to modify this assignment' });
    }

    // Auto-calculate progress based on checklist
    let calculatedProgress = progress;
    if (checklist) {
      const checklistItems = typeof checklist === 'string' ? JSON.parse(checklist) : checklist;
      if (Array.isArray(checklistItems) && checklistItems.length > 0) {
        const completedCount = checklistItems.filter(item => item.completed).length;
        calculatedProgress = Math.round((completedCount / checklistItems.length) * 100);
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        checklist: checklist ? (typeof checklist === 'string' ? checklist : JSON.stringify(checklist)) : undefined,
        progress: calculatedProgress !== undefined ? calculatedProgress : undefined,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
    });

    // Notify creator if status changed to completed
    if (status === 'COMPLETED' && assignment.status !== 'COMPLETED') {
      const creatorId = assignment.job.creatorId;
      if (creatorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: creatorId,
            title: 'Task Completed',
            description: `"${assignment.title}" has been marked completed by ${req.user.username}.`,
            type: 'JOB_UPDATE',
            link: `/jobs/${assignment.jobId}`,
          },
        });
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Confirm Completion (Owner / Managers only)
export const confirmAssignmentCompletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { confirmed } = req.body;

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        completionConfirmed: confirmed === true || confirmed === 'true',
        status: confirmed ? 'COMPLETED' : assignment.status,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Assignment
export const deleteAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    await prisma.assignment.delete({ where: { id: assignmentId } });
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== COMMENTS CONTROLLERS ====================

// Add Comment
export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { assignmentId } = req.params;
    const { content, attachments } = req.body;

    if (!content) return res.status(400).json({ error: 'Comment content cannot be empty' });

    const comment = await prisma.comment.create({
      data: {
        assignmentId,
        userId: req.user.id,
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Assignment Comments
export const getComments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { assignmentId },
      include: {
        user: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
