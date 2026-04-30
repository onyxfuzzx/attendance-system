import { sql, getPool } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface Shift {
  id: string;
  location_id: string;
  location_name?: string;
  name: string;
  start_time: string;
  end_time: string;
  days_mask: number;
  is_active: boolean;
  created_at: Date;
}

export class ShiftRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async findAllActive(): Promise<Shift[]> {
    const result = await this.pool.request()
      .query(`
        SELECT s.*, l.name AS location_name
        FROM Shifts s
        JOIN Locations l ON s.location_id = l.id
        WHERE s.is_active = 1
        ORDER BY l.name, s.start_time
      `);
    return result.recordset;
  }

  async findById(id: string): Promise<Shift | null> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT s.*, l.name AS location_name
        FROM Shifts s
        JOIN Locations l ON s.location_id = l.id
        WHERE s.id = @id
      `);
    return result.recordset[0] || null;
  }

  async create(data: any): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, data.id)
      .input('location_id', sql.UniqueIdentifier, data.location_id)
      .input('name', sql.NVarChar, data.name)
      .input('start_time', sql.VarChar, data.start_time)
      .input('end_time', sql.VarChar, data.end_time)
      .input('days_mask', sql.Int, data.days_mask || 127)
      .query(`
        INSERT INTO Shifts (id, location_id, name, start_time, end_time, days_mask)
        VALUES (@id, @location_id, @name, @start_time, @end_time, @days_mask)
      `);
  }

  async update(id: string, data: any): Promise<void> {
    const request = this.pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    
    let query = 'UPDATE Shifts SET ';
    const updates: string[] = [];
    if (data.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, data.name);
    }
    if (data.start_time !== undefined) {
      updates.push('start_time = @start_time');
      request.input('start_time', sql.VarChar, data.start_time);
    }
    if (data.end_time !== undefined) {
      updates.push('end_time = @end_time');
      request.input('end_time', sql.VarChar, data.end_time);
    }
    if (data.days_mask !== undefined) {
      updates.push('days_mask = @days_mask');
      request.input('days_mask', sql.Int, data.days_mask);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, data.is_active ? 1 : 0);
    }
    
    if (updates.length === 0) return;
    query += updates.join(', ') + ' WHERE id = @id';
    await request.query(query);
  }

  async deactivate(id: string): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE Shifts SET is_active = 0 WHERE id = @id');
  }

  async findByUserId(userId: string): Promise<Shift[]> {
    const result = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT s.*, l.name AS location_name
        FROM UserShifts us
        JOIN Shifts s ON us.shift_id = s.id
        JOIN Locations l ON s.location_id = l.id
        WHERE us.user_id = @userId AND s.is_active = 1
        ORDER BY s.start_time
      `);
    return result.recordset;
  }

  async findEmployeesByShift(shiftId: string): Promise<any[]> {
    const result = await this.pool.request()
      .input('shiftId', sql.UniqueIdentifier, shiftId)
      .query(`
        SELECT u.id, u.full_name, u.email, u.phone, us.effective_from
        FROM UserShifts us
        JOIN Users u ON us.user_id = u.id
        WHERE us.shift_id = @shiftId AND u.is_active = 1
        ORDER BY u.full_name
      `);
    return result.recordset;
  }

  async assignEmployees(shiftId: string, userIds: string[], effectiveFrom: string): Promise<void> {
    const transaction = new sql.Transaction(this.pool);
    try {
      await transaction.begin();
      for (const userId of userIds) {
        const request = new sql.Request(transaction);
        await request
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('user_id', sql.UniqueIdentifier, userId)
          .input('shift_id', sql.UniqueIdentifier, shiftId)
          .input('effective_from', sql.Date, effectiveFrom)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM UserShifts WHERE user_id = @user_id AND shift_id = @shift_id AND effective_from = @effective_from)
            BEGIN
              INSERT INTO UserShifts (id, user_id, shift_id, effective_from)
              VALUES (@id, @user_id, @shift_id, @effective_from)
            END
          `);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeEmployee(shiftId: string, userId: string): Promise<void> {
    await this.pool.request()
      .input('shiftId', sql.UniqueIdentifier, shiftId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM UserShifts WHERE shift_id = @shiftId AND user_id = @userId');
  }
}

export const shiftRepository = new ShiftRepository();
