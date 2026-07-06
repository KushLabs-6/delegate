import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import prisma from './config/db.js';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for dev/testing ease
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files statically
const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', apiRouter);

// Serve Frontend Statically
const frontendDistPath = path.resolve('../frontend/dist');
app.use(express.static(frontendDistPath));

// Temporary admin-reset endpoint — force resets admin password in the live DB
app.post('/admin-init', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await (prisma as any).user.upsert({
      where: { email: 'admin@delegate.app' },
      update: { password: hashedPassword, isSystemAdmin: true, username: 'admin', fullName: 'System Administrator' },
      create: { username: 'admin', fullName: 'System Administrator', email: 'admin@delegate.app', password: hashedPassword, isSystemAdmin: true },
    });
    res.json({ ok: true, email: admin.email, message: 'Admin password reset to admin123' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback for React Router (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start Database Seeding and Express Server
const startServer = async () => {
  try {
    // Basic verification of DB connection
    await prisma.$connect();
    console.log('Successfully connected to the database.');

    // Always upsert the system admin to ensure credentials are correct
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@delegate.app' },
      update: {
        password: hashedPassword,
        isSystemAdmin: true,
        username: 'admin',
        fullName: 'System Administrator',
      },
      create: {
        username: 'admin',
        fullName: 'System Administrator',
        email: 'admin@delegate.app',
        password: hashedPassword,
        isSystemAdmin: true,
      },
    });
    console.log(`Admin account ready: ${admin.email} / admin123`);

    app.listen(PORT, () => {
      console.log(`Delegate Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
