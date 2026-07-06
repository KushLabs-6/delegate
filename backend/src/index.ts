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

// Root/Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'Delegate API is running', env: process.env.NODE_ENV });
});

// Start Database Seeding and Express Server
const startServer = async () => {
  try {
    // Basic verification of DB connection
    await prisma.$connect();
    console.log('Successfully connected to the database.');

    // Seed default System Administrator if database is empty
    const adminCount = await prisma.user.count({
      where: { isSystemAdmin: true }
    });

    if (adminCount === 0) {
      console.log('No system administrator found. Seeding default admin account...');
      const hashedPassword = await bcrypt.hash('Password123', 10);
      
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          fullName: 'System Administrator',
          email: 'admin@delegate.app',
          password: hashedPassword,
          isSystemAdmin: true,
        }
      });
      console.log(`Default Admin Account Seeded:`);
      console.log(`- Email: ${admin.email}`);
      console.log(`- Password: Password123`);
    }

    app.listen(PORT, () => {
      console.log(`Delegate Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
