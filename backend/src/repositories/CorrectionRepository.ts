import { sql, getPool } from '../config/db';

export interface CorrectionRequest {
  id: string;
  user_id: string;
  user_name?: string;
  user_photo?: string;
  attendance_id?: string;
  original_scan_time?: Date;
  location_id?: string;
  request_type: string;
  reason?: string;
  status: string;
  reviewer_id?: string;
  reviewer_notes?: string;
  request_date: Date;
  reviewed_date?: Date;
}

export class CorrectionRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async findByFilters(filters: any): Promise<CorrectionRequest[]> {
    const request = this.pool.request();
    let query = `
      SELECT cr.*, u.full_name AS user_name, u.profile_pic_url AS user_photo,
             al.scan_time AS original_scan_time
      FROM CorrectionRequests cr
      JOIN Users u ON cr.user_id = u.id
      LEFT JOIN AttendanceLogs al ON cr.attendance_id = al.id
    `;
    
    const conditions: string[] = [];
    if (filters.userId) {
      conditions.push('cr.user_id = @userId');
      request.input('userId', sql.UniqueIdentifier, filters.userId);
    }
    if (filters.status) {
      conditions.push('cr.status = @status');
      request.input('status', sql.NVarChar, filters.status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY cr.request_date DESC';
    const result = await request.query(query);
    return result.recordset;
  }

  async findById(id: string): Promise<CorrectionRequest | null> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT cr.*, u.full_name AS user_name, u.profile_pic_url AS user_photo,
               al.scan_time AS original_scan_time, al.location_id
        FROM CorrectionRequests cr
        JOIN Users u ON cr.user_id = u.id
        LEFT JOIN AttendanceLogs al ON cr.attendance_id = al.id
        WHERE cr.id = @id
      `);
    return result.recordset[0] || null;
  }

  async create(data: any): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, data.id)
      .input('user_id', sql.UniqueIdentifier, data.user_id)
      .input('attendance_id', sql.UniqueIdentifier, data.attendance_id || null)
      .input('request_type', sql.NVarChar, data.request_type)
      .input('reason', sql.NVarChar, data.reason || null)
      .query(`
        INSERT INTO CorrectionRequests (id, user_id, attendance_id, request_type, reason, status, request_date)
        VALUES (@id, @user_id, @attendance_id, @request_type, @reason, 'pending', GETDATE())
      `);
  }

  async review(id: string, reviewerId: string, status: string, notes?: string): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('reviewerId', sql.UniqueIdentifier, reviewerId)
      .input('status', sql.NVarChar, status)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        UPDATE CorrectionRequests
        SET status = @status,
            reviewer_id = @reviewerId,
            reviewer_notes = @notes,
            reviewed_date = GETDATE()
        WHERE id = @id
      `);
  }
}

export const correctionRepository = new CorrectionRepository();
