import { sql, getPool } from '../config/db';
import { User, CreateUserDTO, UpdateUserDTO } from '../models/user';

export class UserRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');
    
    return result.recordset[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM Users WHERE id = @id');
    
    return result.recordset[0] || null;
  }

  async create(user: CreateUserDTO & { id: string }): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, user.id)
      .input('email', sql.NVarChar, user.email)
      .input('password', sql.NVarChar, user.password)
      .input('full_name', sql.NVarChar, user.full_name)
      .input('phone', sql.NVarChar, user.phone || null)
      .input('role', sql.NVarChar, user.role || 'employee')
      .query(`
        INSERT INTO Users (id, email, password, full_name, phone, role)
        VALUES (@id, @email, @password, @full_name, @phone, @role)
      `);
  }

  async update(id: string, data: UpdateUserDTO): Promise<void> {
    const request = this.pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    
    let query = 'UPDATE Users SET updated_at = GETDATE()';
    if (data.full_name !== undefined) {
      query += ', full_name = @full_name';
      request.input('full_name', sql.NVarChar, data.full_name);
    }
    if (data.phone !== undefined) {
      query += ', phone = @phone';
      request.input('phone', sql.NVarChar, data.phone);
    }
    if (data.is_active !== undefined) {
      query += ', is_active = @is_active';
      request.input('is_active', sql.Bit, data.is_active ? 1 : 0);
    }
    
    query += ' WHERE id = @id';
    await request.query(query);
  }

  async findAll(options: { limit?: number; offset?: number; search?: string } = {}): Promise<{ users: User[]; total: number }> {
    const { limit = 10, offset = 0, search } = options;
    const request = this.pool.request();
    
    let whereClause = " WHERE role != 'admin'";
    if (search) {
      whereClause += ' AND (email LIKE @search OR full_name LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    const countResult = await request.query(`SELECT COUNT(*) as total FROM Users${whereClause}`);
    const total = countResult.recordset[0].total;

    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);

    const result = await request.query(`
      SELECT u.*,
             (SELECT STRING_AGG(s.name, ', ') 
              FROM UserShifts us 
              JOIN Shifts s ON us.shift_id = s.id 
              WHERE us.user_id = u.id AND s.is_active = 1) AS assigned_shifts
      FROM Users u
      ${whereClause}
      ORDER BY u.full_name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    
    return { users: result.recordset, total };
  }

  async hasActiveShifts(userId: string): Promise<boolean> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query('SELECT TOP 1 1 as [exists] FROM UserShifts us JOIN Shifts s ON us.shift_id = s.id WHERE us.user_id = @id AND s.is_active = 1');
    return (result.recordset.length > 0);
  }

  async deactivate(id: string): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE Users SET is_active = 0 WHERE id = @id');
  }

  async hardDelete(id: string): Promise<void> {
    const transaction = new sql.Transaction(this.pool);
    try {
      await transaction.begin();
      const request = new sql.Request(transaction);
      request.input('id', sql.UniqueIdentifier, id);
      
      // Delete from UserShifts
      await request.query('DELETE FROM UserShifts WHERE user_id = @id');
      
      // Update CorrectionRequests where user is reviewer
      await request.query('UPDATE CorrectionRequests SET reviewer_id = NULL WHERE reviewer_id = @id');
      
      // Delete CorrectionRequests where user is requestor
      await request.query('DELETE FROM CorrectionRequests WHERE user_id = @id');
      
      // Delete AttendanceLogs
      await request.query('DELETE FROM AttendanceLogs WHERE user_id = @id');
      
      // Update AuditTrail
      await request.query('UPDATE AuditTrail SET actor_id = NULL WHERE actor_id = @id');
      
      // Delete the User
      await request.query('DELETE FROM Users WHERE id = @id');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
