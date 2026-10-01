import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'Hi-Garment-warehouse',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '12345678x@X',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err)
})
