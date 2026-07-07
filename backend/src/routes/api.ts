import { Router } from 'express';
import prisma from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  deleteAccount
} from '../controllers/authController.js';
import {
  createBusiness,
  getBusinesses,
  getBusinessDetails,
  updateBusiness,
  deleteBusiness,
  inviteMember,
  manageMemberRole,
  removeMember,
  createTeamGroup,
  getGroups,
  getGroupDetails,
  joinGroupByCode,
  leaveGroup,
  getInviteQRCode,
  joinBusinessByCode
} from '../controllers/businessController.js';
import {
  createJob,
  getJobs,
  getJobDetails,
  updateJob,
  deleteJob,
  signupForJob,
  cancelSignup,
  approveSignup,
  rejectSignup,
  getMySchedule,
  createAssignment,
  updateAssignment,
  confirmAssignmentCompletion,
  deleteAssignment,
  addComment,
  getComments
} from '../controllers/jobController.js';
import {
  sendMessage,
  getMessages,
  togglePinMessage,
  reactToMessage,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/chatController.js';
import {
  getBusinessStats,
  getChartsData,
  getMostActiveMembers,
  getActivityLogs,
  getSystemUsers,
  getSystemBusinesses
} from '../controllers/analyticsController.js';
import { authenticateToken, requireRole, requireSystemAdmin } from '../middleware/auth.js';

// Setup file upload directories
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const router = Router();

// ==================== AUTHENTICATION ====================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);
router.put('/auth/profile', authenticateToken, updateProfile);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/profile-image', authenticateToken, upload.single('image'), uploadProfileImage);
router.post('/auth/request-reset', requestPasswordReset);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/verify-email', verifyEmail);
router.delete('/auth/delete-account', authenticateToken, deleteAccount);

// ==================== BUSINESSES ====================
router.post('/businesses', authenticateToken, createBusiness);
router.get('/businesses', authenticateToken, getBusinesses);
router.get('/businesses/:businessId', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'GUEST']), getBusinessDetails);
router.put('/businesses/:businessId', authenticateToken, requireRole(['OWNER', 'ADMIN']), updateBusiness);
router.delete('/businesses/:businessId', authenticateToken, requireRole(['OWNER']), deleteBusiness);
router.post('/businesses/join', authenticateToken, joinBusinessByCode);

// Business Member Invites/Roles
router.post('/businesses/:businessId/invite', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER']), inviteMember);
router.put('/businesses/:businessId/role', authenticateToken, requireRole(['OWNER', 'ADMIN']), manageMemberRole);
router.post('/businesses/:businessId/remove', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER']), removeMember);

// ==================== TEAM GROUPS ====================
router.post('/businesses/:businessId/groups', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR']), createTeamGroup);
router.get('/businesses/:businessId/groups', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'GUEST']), getGroups);
router.get('/groups/:groupId', authenticateToken, getGroupDetails);
router.post('/groups/join', authenticateToken, joinGroupByCode);
router.delete('/groups/:groupId/leave', authenticateToken, leaveGroup);
router.get('/groups/qr/:inviteCode', getInviteQRCode);

// ==================== JOBS ====================
router.post('/businesses/:businessId/jobs', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER']), createJob);
router.get('/businesses/:businessId/jobs', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'GUEST']), getJobs);
router.get('/jobs/:jobId', authenticateToken, getJobDetails);
router.put('/jobs/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    req.body.businessId = job.businessId; // inject businessId context for requireRole
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}, requireRole(['OWNER', 'ADMIN', 'MANAGER']), updateJob);
router.delete('/jobs/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    req.body.businessId = job.businessId; // inject businessId context for requireRole
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}, requireRole(['OWNER', 'ADMIN', 'MANAGER']), deleteJob);

// ==================== SHIFT SIGNUPS ====================
router.post('/jobs/:jobId/signup', authenticateToken, signupForJob);
router.delete('/jobs/:jobId/signup', authenticateToken, cancelSignup);
router.put('/signups/:signupId/approve', authenticateToken, approveSignup);
router.put('/signups/:signupId/reject', authenticateToken, rejectSignup);
router.get('/my-schedule', authenticateToken, getMySchedule);

// ==================== ASSIGNMENTS ====================
router.post('/jobs/:jobId/assignments', authenticateToken, createAssignment);
router.put('/assignments/:assignmentId', authenticateToken, updateAssignment);
router.put('/assignments/:assignmentId/confirm', authenticateToken, confirmAssignmentCompletion);
router.delete('/assignments/:assignmentId', authenticateToken, deleteAssignment);

// ==================== COMMENTS ====================
router.post('/assignments/:assignmentId/comments', authenticateToken, addComment);
router.get('/assignments/:assignmentId/comments', authenticateToken, getComments);

// ==================== MESSAGING & CHATS ====================
router.post('/messages', authenticateToken, sendMessage);
router.get('/messages', authenticateToken, getMessages);
router.put('/messages/pin/:messageId', authenticateToken, togglePinMessage);
router.post('/messages/react/:messageId', authenticateToken, reactToMessage);

// ==================== NOTIFICATIONS ====================
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/:notificationId/read', authenticateToken, markNotificationRead);
router.put('/notifications/read-all', authenticateToken, markAllNotificationsRead);

// ==================== ANALYTICS & LOGS ====================
router.get('/businesses/:businessId/stats', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'GUEST']), getBusinessStats);
router.get('/businesses/:businessId/charts', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER']), getChartsData);
router.get('/businesses/:businessId/active-members', authenticateToken, requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'GUEST']), getMostActiveMembers);
router.get('/businesses/:businessId/logs', authenticateToken, requireRole(['OWNER', 'ADMIN']), getActivityLogs);

// ==================== SYSTEM ADMIN ====================
router.get('/admin/users', authenticateToken, requireSystemAdmin, getSystemUsers);
router.get('/admin/businesses', authenticateToken, requireSystemAdmin, getSystemBusinesses);

// ==================== GENERIC FILE UPLOAD ====================
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
