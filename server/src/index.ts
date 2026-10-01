import dotenv from 'dotenv'
import path from 'path'
import { app } from './app'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[API Server] Running at http://localhost:${PORT}`)
})
