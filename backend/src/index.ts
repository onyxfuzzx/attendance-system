// Config module loads dotenv automatically
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import config from './config';
import { initDatabase } from './config/db';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import locationsRouter from './routes/locations';
import shiftsRouter from './routes/shifts';
import employeesRouter from './routes/employees';
import attendanceRouter from './routes/attendance';
import correctionsRouter from './routes/corrections';
import auditRouter from './routes/audit';
import analyticsRouter from './routes/analytics';
import { upload, handleUploadError } from './middleware/upload';
import { errorHandler, AppError } from './middleware/error';

const app = express();

// Security: Check for required environment variables (Updated for SQLite/D1)
const requiredEnv = ['JWT_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`[CRITICAL] Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const uploadDirs = [config.upload.profileDir, config.upload.attendanceDir];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[System] Created directory: ${dir}`);
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Static files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/corrections', correctionsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/analytics', analyticsRouter);

// Profile picture upload endpoint
app.post('/api/profile/picture', upload, handleUploadError, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
    res.json({ profile_pic_url: profilePicUrl });
  } catch (error) {
    next(error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    db: 'MS SQL Server'
  });
});

// Global Error Handler (MUST be last)
app.use(errorHandler);

const PORT = config.server.port;

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from './repositories/UserRepository';

async function startServer() {
  try {
    console.log('[System] Starting application...');
    await initDatabase();
    console.log('[System] MS SQL Server database initialized');
    
    // Seed default admin user
    const adminEmail = 'admin@system.com';
    const existingAdmin = await userRepository.findByEmail(adminEmail);
    if (!existingAdmin) {
      console.log('[System] Seeding default admin user...');
      await userRepository.create({
        id: uuidv4(),
        email: adminEmail,
        password: bcrypt.hashSync('12345678', 10),
        full_name: 'System Admin',
        role: 'admin' as any
      });
      console.log('[System] Default admin user seeded successfully.');
    }
    
    app.listen(PORT, () => {
      console.log(`[System] Backend server is listening on port ${PORT}`);
      console.log(`[System] Frontend origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('[CRITICAL] Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[System] SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

startServer();