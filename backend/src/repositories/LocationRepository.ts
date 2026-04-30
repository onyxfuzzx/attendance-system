import { sql, getPool } from '../config/db';

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  qr_data?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class LocationRepository {
  private get pool(): sql.ConnectionPool {
    return getPool();
  }

  async findAll(options: { limit?: number; offset?: number; search?: string } = {}): Promise<{ locations: Location[]; total: number }> {
    const { limit = 10, offset = 0, search } = options;
    const request = this.pool.request();
    
    let whereClause = '';
    if (search) {
      whereClause = ' WHERE name LIKE @search';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    const countResult = await request.query(`SELECT COUNT(*) as total FROM Locations${whereClause}`);
    const total = countResult.recordset[0].total;

    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);

    const result = await request.query(`
      SELECT * FROM Locations
      ${whereClause}
      ORDER BY name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    
    return { locations: result.recordset, total };
  }

  async findAllActive(): Promise<Location[]> {
    const result = await this.pool.request()
      .query('SELECT * FROM Locations WHERE is_active = 1 ORDER BY name');
    return result.recordset;
  }

  async findById(id: string): Promise<Location | null> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM Locations WHERE id = @id');
    return result.recordset[0] || null;
  }

  async create(data: { id: string; name: string; latitude: number; longitude: number; radius_meters: number }): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, data.id)
      .input('name', sql.NVarChar, data.name)
      .input('latitude', sql.Decimal(18, 10), data.latitude)
      .input('longitude', sql.Decimal(18, 10), data.longitude)
      .input('radius_meters', sql.Int, data.radius_meters)
      .query(`
        INSERT INTO Locations (id, name, latitude, longitude, radius_meters)
        VALUES (@id, @name, @latitude, @longitude, @radius_meters)
      `);
  }

  async update(id: string, data: any): Promise<void> {
    const request = this.pool.request();
    request.input('id', sql.UniqueIdentifier, id);
    
    let query = 'UPDATE Locations SET updated_at = GETDATE()';
    if (data.name !== undefined) {
      query += ', name = @name';
      request.input('name', sql.NVarChar, data.name);
    }
    if (data.latitude !== undefined) {
      query += ', latitude = @latitude';
      request.input('latitude', sql.Decimal(18, 10), data.latitude);
    }
    if (data.longitude !== undefined) {
      query += ', longitude = @longitude';
      request.input('longitude', sql.Decimal(18, 10), data.longitude);
    }
    if (data.radius_meters !== undefined) {
      query += ', radius_meters = @radius_meters';
      request.input('radius_meters', sql.Int, data.radius_meters);
    }
    if (data.is_active !== undefined) {
      query += ', is_active = @is_active';
      request.input('is_active', sql.Bit, data.is_active ? 1 : 0);
    }
    
    query += ' WHERE id = @id';
    await request.query(query);
  }

  async deactivate(id: string): Promise<void> {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE Locations SET is_active = 0 WHERE id = @id');
  }

  async hasActiveShifts(locationId: string): Promise<boolean> {
    const result = await this.pool.request()
      .input('id', sql.UniqueIdentifier, locationId)
      .query('SELECT TOP 1 1 as [exists] FROM Shifts WHERE location_id = @id AND is_active = 1');
    return (result.recordset.length > 0);
  }
}

export const locationRepository = new LocationRepository();
