import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { attendanceRepository } from '../repositories/AttendanceRepository';
import { locationRepository } from '../repositories/LocationRepository';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getDistance } from '../utils/geofence';
import { createAuditLog } from '../services/audit';
import config from '../config';
import { AppError } from '../middleware/error';
import { validateBody } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { date, month, location_id, user_id, status, limit, offset } = req.query;
    
    const filters: any = { 
      date, 
      month,
      locationId: location_id, 
      status,
      limit: limit ? parseInt(limit as string) : 10,
      offset: offset ? parseInt(offset as string) : 0
    };
    
    if (req.user!.role !== 'admin') {
      filters.userId = userId;
    } else if (user_id) {
      filters.userId = user_id;
    }
    
    const { logs, total } = await attendanceRepository.findByFilters(filters);
    res.json({ logs, total });
  } catch (error) {
    next(error);
  }
});

router.get('/export', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { date, month, location_id, user_id, status } = req.query;
    
    const filters: any = { 
      date, 
      month,
      locationId: location_id, 
      status,
      limit: 10000,
      offset: 0
    };
    
    if (req.user!.role !== 'admin') {
      filters.userId = userId;
    } else if (user_id) {
      filters.userId = user_id;
    }
    
    const { logs } = await attendanceRepository.findByFilters(filters);
    
    const headers = ['Date', 'Time', 'Employee Name', 'Location', 'Status', 'Geofence Verified', 'Distance (m)'];
    const rows = logs.map(log => {
      const logDate = new Date(log.scan_time);
      return [
        logDate.toLocaleDateString(),
        logDate.toLocaleTimeString(),
        `"${log.user_name || ''}"`,
        `"${log.location_name || ''}"`,
        log.status,
        log.is_within_geofence ? 'Yes' : 'No',
        log.distance_from_center
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

router.post('/scan', authenticate, validateBody(['latitude', 'longitude']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { latitude, longitude, face_photo, device_info } = req.body;

    if (req.user!.role !== 'employee') {
      throw new AppError('Only employees can submit attendance scans', 403);
    }

    const now = new Date();
    const dayMask = Math.pow(2, now.getDay());
    const currentTimeStr = now.toTimeString().slice(0, 8);
    const todayDateStr = now.toISOString().split('T')[0];

    const assignedShift = await attendanceRepository.findAssignedShift(userId, dayMask, currentTimeStr);
    if (!assignedShift) {
      await createAuditLog({
        actorId: userId,
        action: 'ATTENDANCE_SCAN_DENIED',
        details: { reason: 'No active shift assigned', latitude, longitude }
      });
      throw new AppError('No active shift assigned for this time window', 403);
    }

    const locationId = assignedShift.location_id;
    
    // 1. Anti-spam: Check for recent scans (within 30 seconds)
    const recentScan = await attendanceRepository.findRecentScan(userId, locationId, 30);
    if (recentScan) {
      throw new AppError('Please wait a moment before scanning again.', 429);
    }

    // 2. Get Location Info
    const location = await locationRepository.findById(locationId);
    if (!location || !location.is_active) {
      throw new AppError('Assigned location is inactive or missing', 404);
    }
    
    // 3. Calculate Distance
    const distance = getDistance(latitude, longitude, location.latitude, location.longitude);
    const isWithinGeofenceResult = distance <= location.radius_meters ? 1 : 0;

    if (!isWithinGeofenceResult) {
      await createAuditLog({
        actorId: userId,
        action: 'ATTENDANCE_GEOFENCE_DENIED',
        details: { location_id: locationId, latitude, longitude, distance }
      });
      throw new AppError(`Outside authorized geofence (${Math.round(distance)}m from center)`, 403);
    }
    
    // 4. Attendance Algorithm
    let scanType = 'in'; 
    const lastScanToday = await attendanceRepository.findLastScanToday(userId, todayDateStr);

    if (lastScanToday) {
      scanType = lastScanToday.status.includes('in') ? 'out' : 'in';
    }
    
    const shiftStart = assignedShift.start_time;
    const shiftEnd = assignedShift.end_time;
    const graceMinutes = 15;
    let status = 'present';

    if (scanType === 'in') {
      const startWithGrace = addMinutes(shiftStart, graceMinutes);
      status = currentTimeStr > startWithGrace ? 'late' : 'on_time';
    } else {
      status = currentTimeStr < shiftEnd ? 'early_departure' : 'on_time';
    }

    const finalStatus = `${scanType}_${status}`;
    
    // 5. Handle Face Photo
    let photoUrl = null;
    if (face_photo) {
      try {
        const base64Data = face_photo.replace(/^data:image\/\w+;base64,/, '');
        const filename = `${userId}-${Date.now()}.jpg`;
        const filepath = path.join(config.upload.attendanceDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        photoUrl = `/uploads/attendance/${filename}`;
      } catch (e) {
        console.error('[System] Photo save error:', e);
      }
    }
    
    // 6. Log Attendance
    const id = uuidv4();
    await attendanceRepository.create({
      id,
      user_id: userId,
      location_id: locationId,
      latitude,
      longitude,
      distance_from_center: distance,
      is_within_geofence: !!isWithinGeofenceResult,
      face_photo_url: photoUrl,
      device_info: device_info || null,
      shift_id: assignedShift.id,
      status: finalStatus
    });
    
    await createAuditLog({
      actorId: userId,
      action: 'ATTENDANCE_SCAN',
      targetType: 'Attendance',
      targetId: id,
      details: { location_id: locationId, is_within_geofence: !!isWithinGeofenceResult, distance, status: finalStatus, scan_type: scanType }
    });
    
    res.status(201).json({
      id,
      location_name: location.name,
      is_within_geofence: !!isWithinGeofenceResult,
      distance,
      status: finalStatus,
      scan_type: scanType,
      scan_time: now.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

function addMinutes(timeStr: string | any, minutes: number): string {
  if (!timeStr) return new Date().toTimeString().slice(0, 8);
  const str = typeof timeStr === 'string' ? timeStr : 
              (timeStr instanceof Date ? timeStr.toISOString().substring(11, 19) : String(timeStr));
  const parts = str.split(':');
  // Handle HH:MM:SS or HH:MM
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parts[2] ? parseInt(parts[2], 10) : 0;
  
  const date = new Date();
  date.setHours(h, m + minutes, s);
  return date.toTimeString().slice(0, 8);
}

export default router;