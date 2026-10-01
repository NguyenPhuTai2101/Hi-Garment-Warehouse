import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const isCloud = (process.env.PG_HOST || '').includes('supabase') || (process.env.DATABASE_URL || '').includes('supabase')

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.PG_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        database: process.env.PG_DATABASE || 'postgres',
        user: process.env.PG_USER || 'postgres.ocydpouywtwgziubkqos',
        password: process.env.PG_PASSWORD || 'Hailinh@%15',
        ssl: isCloud ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      }
)

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err)
})
