import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a meeting
export const createMeeting = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { title, description, startTime } = req.body;

        // Verify the user is in this group or is business owner (we assume auth checks happen, just do basic check)
        const group = await prisma.teamGroup.findUnique({
            where: { id: groupId },
            include: { business: true }
        });

        if (!group) return res.status(404).json({ error: 'Group not found' });

        const meeting = await prisma.meeting.create({
            data: {
                groupId,
                title,
                description,
                startTime: new Date(startTime),
            }
        });

        return res.status(201).json(meeting);
    } catch (err: any) {
        console.error('Create meeting error:', err);
        return res.status(500).json({ error: err.message });
    }
};

// Get meetings for a group
export const getMeetings = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { groupId } = req.params;

        const meetings = await prisma.meeting.findMany({
            where: { groupId },
            include: {
                attendance: {
                    include: { user: { select: { id: true, fullName: true, email: true, profileImage: true } } }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        return res.json(meetings);
    } catch (err: any) {
        console.error('Get meetings error:', err);
        return res.status(500).json({ error: err.message });
    }
};

// Mark attendance
export const markAttendance = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { userId, status } = req.body; // status: "PRESENT", "ABSENT", "LATE"

        const attendance = await prisma.meetingAttendance.upsert({
            where: {
                meetingId_userId: { meetingId, userId }
            },
            update: { status },
            create: {
                meetingId,
                userId,
                status
            }
        });

        return res.json(attendance);
    } catch (err: any) {
        console.error('Mark attendance error:', err);
        return res.status(500).json({ error: err.message });
    }
};

// Delete a meeting
export const deleteMeeting = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { meetingId } = req.params;

        await prisma.meeting.delete({
            where: { id: meetingId }
        });

        return res.json({ message: 'Meeting deleted successfully' });
    } catch (err: any) {
        console.error('Delete meeting error:', err);
        return res.status(500).json({ error: err.message });
    }
};
