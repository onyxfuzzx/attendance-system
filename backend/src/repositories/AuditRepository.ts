import { sql, getPool } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
  id: string;
  actor_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  created_at: Date;
}

export class AuditRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async create(data: any): Promise<void> {
    try {
      await this.pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('actor_id', sql.UniqueIdentifier, data.actorId || null)
        .input('action', sql.NVarChar, data.action)
        .input('target_type', sql.NVarChar, data.targetType || null)
        .input('target_id', sql.NVarChar, data.targetId || null)
        .input('details', sql.NVarChar, data.details ? JSON.stringify(data.details) : null)
        .query(`
          INSERT INTO AuditTrail (id, actor_id, action, target_type, target_id, details, created_at)
          VALUES (@id, @actor_id, @action, @target_type, @target_id, @details, GETDATE())
        `);
    } catch (error) {
      console.error('Failed to create audit log in DB:', error);
    }
  }

  async findAll(): Promise<AuditLog[]> {
    const result = await this.pool.request()
      .query('SELECT * FROM AuditTrail ORDER BY created_at DESC');
    return result.recordset;
  }
}

export const auditRepository = new AuditRepository();
