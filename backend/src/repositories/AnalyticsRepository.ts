import { sql, getPool } from '../config/db';

export class AnalyticsRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async getEmployeeStats(userId: string): Promise<any> {
    const weeklyResult = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        WITH DailyBoundaries AS (
          SELECT CAST(scan_time AS DATE) as log_date,
                 MIN(scan_time) as first_in,
                 MAX(scan_time) as last_out
          FROM AttendanceLogs
          WHERE user_id = @userId AND scan_time >= DATEADD(day, -7, GETDATE())
          GROUP BY CAST(scan_time AS DATE)
        )
        SELECT COUNT(*) as days_worked,
               SUM(DATEDIFF(second, first_in, last_out) / 3600.0) as total_hours
        FROM DailyBoundaries
      `);

    const statusResult = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT status, COUNT(*) as count
        FROM AttendanceLogs
        WHERE user_id = @userId AND scan_time >= DATEADD(day, -30, GETDATE())
        GROUP BY status
      `);

    const streakResult = await this.pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(DISTINCT CAST(scan_time AS DATE)) as active_days
        FROM AttendanceLogs
        WHERE user_id = @userId AND scan_time >= DATEADD(day, -30, GETDATE())
      `);

    return {
      weekly: weeklyResult.recordset[0] || { days_worked: 0, total_hours: 0 },
      status_distribution: statusResult.recordset,
      active_days_30: streakResult.recordset[0]?.active_days || 0
    };
  }

  async getSupervisorOverview(): Promise<any> {
    const summaryResult = await this.pool.request()
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM Users WHERE role = 'employee' AND is_active = 1) as total_employees,
          (SELECT COUNT(DISTINCT user_id) FROM AttendanceLogs WHERE CAST(scan_time AS DATE) = CAST(GETDATE() AS DATE)) as present_today,
          (SELECT COUNT(*) FROM CorrectionRequests WHERE status = 'pending') as pending_corrections
      `);

    const activityResult = await this.pool.request()
      .query(`
        SELECT TOP 10 u.full_name, al.status, al.scan_time, l.name as location
        FROM AttendanceLogs al
        JOIN Users u ON al.user_id = u.id
        JOIN Locations l ON al.location_id = l.id
        ORDER BY al.scan_time DESC
      `);

    return {
      summary: summaryResult.recordset[0],
      recent_activity: activityResult.recordset
    };
  }

  async getAdminAnalytics(): Promise<any> {
    const growthResult = await this.pool.request()
      .query(`
        SELECT CAST(created_at AS DATE) as date, COUNT(*) as new_users
        FROM Users
        WHERE created_at >= DATEADD(day, -30, GETDATE())
        GROUP BY CAST(created_at AS DATE)
      `);

    const locationStatsResult = await this.pool.request()
      .query(`
        SELECT l.name, COUNT(al.id) as total_scans
        FROM Locations l
        LEFT JOIN AttendanceLogs al ON l.id = al.location_id
        GROUP BY l.id, l.name
      `);

    return {
      user_growth: growthResult.recordset,
      location_usage: locationStatsResult.recordset
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
