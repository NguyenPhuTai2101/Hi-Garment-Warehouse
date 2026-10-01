import express from 'express'
import cors from 'cors'
import { pool } from './db'
import { ordersRouter } from './routes/orders'
import { cartonsRouter } from './routes/cartons'
import { putawayRouter } from './routes/putaway'
import { lookupRouter } from './routes/lookup'

export const app = express()

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const dbTest = await pool.query('SELECT current_database(), current_user, version()')
    res.json({
      status: 'UP',
      database: dbTest.rows[0].current_database,
      user: dbTest.rows[0].current_user,
      time: new Date().toISOString()
    })
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: err.message })
  }
})

// Mount API modules
app.use('/api/orders', ordersRouter)
app.use('/api/cartons', cartonsRouter)
app.use('/api/putaway', putawayRouter)
app.use('/api/lookup', lookupRouter)
