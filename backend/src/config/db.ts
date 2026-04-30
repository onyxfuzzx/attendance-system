import msv8 from 'msnodesqlv8';
import path from 'path';
import fs from 'fs';
import config from './index';

let pool: any = null;

// Simple wrapper to mimic mssql Request for Repositories
class MsnodesqlRequest {
  private _inputs: { name: string, type: any, value: any }[] = [];

  constructor(parent?: any) {}

  input(name: string, type: any, value: any) {
    this._inputs.push({ name, type, value });
    return this;
  }

  async query(queryText: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let finalQuery = queryText;
      const params: any[] = [];
      
      // Sort inputs by length descending to avoid partial matches (e.g., @user and @user_id)
      const sortedInputs = [...this._inputs].sort((a, b) => b.name.length - a.name.length);
      
      // We need to replace parameters in order and duplicate values for multiple occurrences
      // A better way: find all @name occurrences in the query and build the params array accordingly
      const paramMatches: { index: number, name: string, value: any }[] = [];
      sortedInputs.forEach(input => {
        const regex = new RegExp(`@${input.name}\\b`, 'g');
        let match;
        while ((match = regex.exec(finalQuery)) !== null) {
          paramMatches.push({ index: match.index, name: input.name, value: input.value });
        }
      });
      
      // Sort matches by index to determine order of ?
      paramMatches.sort((a, b) => a.index - b.index);
      
      // Replace all @name with ?
      let resultQuery = finalQuery;
      // We must replace from back to front to avoid shifting indices if we were changing length, 
      // but here we just use ? so we can just use a global replace.
      sortedInputs.forEach(input => {
        const regex = new RegExp(`@${input.name}\\b`, 'g');
        resultQuery = resultQuery.replace(regex, '?');
      });
      
      const finalParams = paramMatches.map(m => m.value);

      msv8.query(pool, resultQuery, finalParams, (err, rows) => {
        console.log(`[DB Debug] Query: ${resultQuery}, Params:`, finalParams, `Err:`, err, `Rows:`, rows ? rows.length : 0);
        if (err) return reject(err);
        resolve({ recordset: rows || [] });
      });
    });
  }

  async batch(queryText: string): Promise<any> {
    return this.query(queryText);
  }
}

export async function initDatabase(): Promise<void> {
  try {
    console.log(`[DB] Connecting to MS SQL Server at ${config.db.mssql.server}`);
    console.log(`[DB] Database: ${config.db.mssql.database}`);
    
    const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${config.db.mssql.server};Database=${config.db.mssql.database};Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate=Yes;`;
    
    pool = connectionString; // In msnodesqlv8, pool can just be the connection string for simple query calls or we can open it.
    
    // Test connection
    await new Promise((resolve, reject) => {
      msv8.open(connectionString, (err, conn) => {
        if (err) return reject(err);
        conn.close(() => resolve(true));
      });
    });

    console.log('[DB] MS SQL connected successfully');

    // Run setup schema
    const schemaPath = path.resolve(__dirname, '../../../database/setup.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('[DB] Running schema setup script...');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const batches = schema.split(/^GO\s*$/im);
      for (const batch of batches) {
        const trimmed = batch.trim();
        if (trimmed && !trimmed.toUpperCase().startsWith('CREATE DATABASE') && !trimmed.toUpperCase().startsWith('USE ')) {
          await new Promise((resolve, reject) => {
            msv8.query(connectionString, trimmed, (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            });
          });
        }
      }
      console.log('[DB] Schema setup completed');
    }

  } catch (error) {
    console.error('[DB] MS SQL initialization failed:', error);
    throw error;
  }
}

// Mock Transaction class for repositories that use it
class MsnodesqlTransaction {
  constructor(pool: any) {}
  async begin() { return this; }
  async commit() { return this; }
  async rollback() { return this; }
}

// Mock types to satisfy TypeScript
const mockType = (name: string) => {
  const fn = () => name;
  (fn as any).toString = () => name;
  return fn as any;
};

export const sqlTypes = {
  NVarChar: mockType('NVarChar'),
  UniqueIdentifier: mockType('UniqueIdentifier'),
  VarChar: mockType('VarChar'),
  Int: mockType('Int'),
  Bit: mockType('Bit'),
  Date: mockType('Date'),
  DateTime2: mockType('DateTime2'),
  Decimal: mockType('Decimal'),
  Time: mockType('Time'),
  Text: mockType('Text')
};

export namespace sql {
  export type ConnectionPool = any;
  export type Request = MsnodesqlRequest;
  export type Transaction = MsnodesqlTransaction;
  export const Request = MsnodesqlRequest;
  export const Transaction = MsnodesqlTransaction;
  export const NVarChar = sqlTypes.NVarChar;
  export const UniqueIdentifier = sqlTypes.UniqueIdentifier;
  export const VarChar = sqlTypes.VarChar;
  export const Int = sqlTypes.Int;
  export const Bit = sqlTypes.Bit;
  export const Date = sqlTypes.Date;
  export const DateTime2 = sqlTypes.DateTime2;
  export const Decimal = sqlTypes.Decimal;
  export const Time = sqlTypes.Time;
  export const Text = sqlTypes.Text;
}

export function getPool(): any {
  if (!pool) throw new Error('Database pool not initialized');
  return {
    request: () => new MsnodesqlRequest(),
    Transaction: MsnodesqlTransaction,
    Request: MsnodesqlRequest
  };
}

export default sql;

// Backward compatibility or legacy helper
export const dbInterface = {
  query: async (queryText: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      msv8.query(pool, queryText, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ results: rows, success: true });
      });
    });
  },
  execute: async (queryText: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      msv8.query(pool, queryText, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ success: true, rowsAffected: rows ? rows.length : 0 });
      });
    });
  },
  first: async (queryText: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      msv8.query(pool, queryText, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows ? rows[0] : null);
      });
    });
  }
};

export const getDb = getPool;

