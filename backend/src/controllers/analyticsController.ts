import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Get Dashboard Statistics
export const getBusinessStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;

    // Total Members
    const totalMembers = await prisma.businessMember.count({
      where: { businessId },
    });

    // Active Assignments (PENDING or IN_PROGRESS)
    const activeAssignments = await prisma.assignment.count({
      where: {
        job: { businessId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    // Pending Assignments
    const pendingAssignments = await prisma.assignment.count({
      where: {
        job: { businessId },
        status: 'PENDING',
      },
    });

    // Completed Assignments
    const completedAssignments = await prisma.assignment.count({
      where: {
        job: { businessId },
        status: 'COMPLETED',
      },
    });

    // Total Jobs
    const totalJobs = await prisma.job.count({
      where: { businessId },
    });

    const completedJobs = await prisma.job.count({
      where: { businessId, status: 'COMPLETED' },
    });

    const pendingJobs = await prisma.job.count({
      where: { businessId, status: 'PENDING' },
    });

    const activeJobs = await prisma.job.count({
      where: { businessId, status: 'IN_PROGRESS' },
    });

    // Recent Activity Logs (top 10)
    const recentActivity = await prisma.activityLog.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      totalMembers,
      activeAssignments,
      pendingAssignments,
      completedAssignments,
      totalJobs,
      completedJobs,
      pendingJobs,
      activeJobs,
      recentActivity,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Analytics Charts Data (Jobs Completed vs Pending)
export const getChartsData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;

    // Fetch jobs created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const jobs = await prisma.job.findMany({
      where: {
        businessId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Group jobs by date (last 7 days for simpler client rendering)
    const weeklyActivity: Record<string, { completed: number; pending: number; total: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      weeklyActivity[dateString] = { completed: 0, pending: 0, total: 0 };
    }

    jobs.forEach(job => {
      const dateString = new Date(job.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
      });
      if (weeklyActivity[dateString]) {
        weeklyActivity[dateString].total++;
        if (job.status === 'COMPLETED') {
          weeklyActivity[dateString].completed++;
        } else {
          weeklyActivity[dateString].pending++;
        }
      }
    });

    // Convert object to array for frontend charts compatibility
    const chartData = Object.entries(weeklyActivity).map(([name, stats]) => ({
      name,
      ...stats,
    }));

    res.json(chartData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Most Active Members
export const getMostActiveMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;

    // Find all users who are members of this business
    const members = await prisma.businessMember.findMany({
      where: { businessId },
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
    });

    // Fetch assignments count per member
    const membersWithStats = await Promise.all(
      members.map(async m => {
        const completedTasks = await prisma.assignment.count({
          where: {
            userId: m.userId,
            job: { businessId },
            status: 'COMPLETED',
          },
        });

        const pendingTasks = await prisma.assignment.count({
          where: {
            userId: m.userId,
            job: { businessId },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        });

        return {
          id: m.userId,
          fullName: m.user.fullName,
          username: m.user.username,
          profileImage: m.user.profileImage,
          role: m.role,
          completedTasks,
          pendingTasks,
          activityScore: completedTasks * 10 + pendingTasks * 5, // Simple ranking index
        };
      })
    );

    // Sort by activity score descending
    membersWithStats.sort((a, b) => b.activityScore - a.activityScore);

    res.json(membersWithStats.slice(0, 10)); // Top 10
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Activity Logs (Audit Trail)
export const getActivityLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    const { action } = req.query;

    const logs = await prisma.activityLog.findMany({
      where: {
        businessId,
        action: action ? (action as string) : undefined,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Cap at 100
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== SYSTEM ADMIN CONTROLLERS ====================

// Get All Users (System Admin)
export const getSystemUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        isSystemAdmin: true,
        dateJoined: true,
      },
      orderBy: { dateJoined: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Businesses (System Admin)
export const getSystemBusinesses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        owner: { select: { id: true, username: true, fullName: true, email: true } },
        _count: { select: { members: true, groups: true, jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(businesses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
