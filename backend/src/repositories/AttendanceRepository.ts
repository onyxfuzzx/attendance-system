import { sql, getPool } from '../config/db';

export interface AttendanceLog {
  id: string;
  user_id: string;
  user_name?: string;
  profile_pic_url?: string;
  location_id: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  distance_from_center: number;
  is_within_geofence: boolean;
  face_photo_url?: string;
  device_info?: string;
  shift_id?: string;
  status: string;
  scan_time: Date;
  created_at: Date;
}

export class AttendanceRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async findByFilters(filters: any): Promise<{ logs: AttendanceLog[]; total: number }> {
    const { limit = 10, offset = 0 } = filters;
    const request = this.pool.request();
    let whereClause = '';
    
    const conditions: string[] = [];
    if (filters.userId) {
      conditions.push('al.user_id = @userId');
      request.input('userId', sql.UniqueIdentifier, filters.userId);
    }
    if (filters.date) {
      conditions.push('CAST(al.scan_time AS DATE) = @date');
      request.input('date', sql.Date, filters.date);
    }
    if (filters.month) {
      conditions.push("FORMAT(al.scan_time, 'yyyy-MM') = @month");
      request.input('month', sql.VarChar, filters.month);
    }
    if (filters.locationId) {
      conditions.push('al.location_id = @locationId');
      request.input('locationId', sql.UniqueIdentifier, filters.locationId);
    }
    if (filters.status) {
      conditions.push('al.status = @status');
      request.input('status', sql.NVarChar, filters.status);
    }
    
    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    const countResult = await request.query(`
      SELECT COUNT(*) as total
      FROM AttendanceLogs al
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);
    
    const query = `
      SELECT al.id, al.user_id, al.location_id, al.latitude, al.longitude, 
             al.distance_from_center, al.is_within_geofence, al.face_photo_url, 
             al.device_info, al.shift_id, al.status,
             CONVERT(varchar, al.scan_time, 126) + '+05:30' as scan_time,
             CONVERT(varchar, al.created_at, 126) + '+05:30' as created_at,
             u.full_name AS user_name, u.profile_pic_url, l.name AS location_name
      FROM AttendanceLogs al
      JOIN Users u ON al.user_id = u.id
      JOIN Locations l ON al.location_id = l.id
      ${whereClause}
      ORDER BY al.scan_time DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    
    const result = await request.query(query);
    return { logs: result.recordset, total };
  }

  async findRecentScan(userId: string, locationId: string, seconds: number): Promise<any> {
    const result = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('locationId', sql.UniqueIdentifier, locationId)
      .input('seconds', sql.Int, seconds)
      .query(`
        SELECT TOP 1 scan_time 
        FROM AttendanceLogs 
        WHERE user_id = @userId AND location_id = @locationId 
        AND scan_time > DATEADD(second, -@seconds, GETDATE())
      `);
    return result.recordset[0];
  }

  async findLastScanToday(userId: string, dateStr: string): Promise<any> {
    const result = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('date', sql.Date, dateStr)
      .query(`
        SELECT TOP 1 status, scan_time 
        FROM AttendanceLogs
        WHERE user_id = @userId AND CAST(scan_time AS DATE) = @date
        ORDER BY scan_time DESC
      `);
    return result.recordset[0];
  }

  async create(data: any): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, data.id)
      .input('user_id', sql.UniqueIdentifier, data.user_id)
      .input('location_id', sql.UniqueIdentifier, data.location_id)
      .input('latitude', sql.Decimal(18, 10), data.latitude)
      .input('longitude', sql.Decimal(18, 10), data.longitude)
      .input('distance_from_center', sql.Decimal(10, 2), data.distance_from_center)
      .input('is_within_geofence', sql.Bit, data.is_within_geofence ? 1 : 0)
      .input('face_photo_url', sql.NVarChar, data.face_photo_url || null)
      .input('device_info', sql.NVarChar, data.device_info || null)
      .input('shift_id', sql.UniqueIdentifier, data.shift_id || null)
      .input('status', sql.NVarChar, data.status)
      .query(`
        INSERT INTO AttendanceLogs (id, user_id, location_id, latitude, longitude, distance_from_center, is_within_geofence, face_photo_url, device_info, shift_id, status, scan_time)
        VALUES (@id, @user_id, @location_id, @latitude, @longitude, @distance_from_center, @is_within_geofence, @face_photo_url, @device_info, @shift_id, @status, GETDATE())
      `);
  }

  async findAssignedShift(userId: string, dayMask: number, currentTime: string): Promise<any> {
    const result = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('dayMask', sql.Int, dayMask)
      .input('currentTime', sql.VarChar, currentTime)
      .query(`
        SELECT TOP 1 s.id, s.location_id, s.start_time, s.end_time
        FROM UserShifts us
        JOIN Shifts s ON us.shift_id = s.id
        WHERE us.user_id = @userId
          AND us.effective_from <= CAST(GETDATE() AS DATE)
          AND s.is_active = 1
          AND (s.days_mask & @dayMask) > 0
          AND s.start_time <= @currentTime
          AND s.end_time >= @currentTime
      `);
    return result.recordset[0];
  }
}

export const attendanceRepository = new AttendanceRepository();
