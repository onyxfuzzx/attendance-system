import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
    jwtExpiry: '1h',
    jwtRefreshExpiry: '7d'
  },
  db: {
    mssql: {
      server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
      database: process.env.DB_NAME || 'AttendanceDB',
      driver: 'msnodesqlv8',
      options: {
        trustedConnection: true,
        trustServerCertificate: true, // For local dev
        enableArithAbort: true
      }
    }
  },
  upload: {
    profileDir:    process.env.UPLOAD_PROFILE_DIR    || './uploads/profiles',
    attendanceDir: process.env.UPLOAD_ATTENDANCE_DIR || './uploads/attendance',
    maxFileSize:   5 * 1024 * 1024
  }
};