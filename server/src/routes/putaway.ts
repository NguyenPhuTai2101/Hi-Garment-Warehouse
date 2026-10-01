import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const putawayRouter = Router()

// GET /api/locations - Danh sách vị trí kệ
putawayRouter.get('/locations', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        location_id AS "locationId",
        zone,
        rack,
        bin,
        description
      FROM locations
      WHERE is_active = TRUE
      ORDER BY location_id ASC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/putaway/carton - Cất nguyên thùng (Thừa kế vị trí cho item con)
putawayRouter.post('/carton', async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    const { cartonId, locationId } = req.body
    if (!cartonId || !locationId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã thùng hoặc mã vị trí kệ' })
    }

    const cleanCartonId = cartonId.trim().toUpperCase()
    const cleanLocationId = locationId.trim().toUpperCase()

    await client.query('BEGIN')

    // 1. Kiểm tra tồn tại thùng
    const cartonRes = await client.query(`SELECT * FROM cartons WHERE carton_id = $1 FOR UPDATE`, [cleanCartonId])
    if (cartonRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Thùng ${cleanCartonId} không tồn tại` })
    }

    // 2. Đảm bảo location tồn tại trong bảng locations
    await client.query(`
      INSERT INTO locations (location_id, zone, rack, bin, description)
      VALUES ($1, 'Khu Chờ', $1, 'Tầng 1', 'Vị trí kệ tạo nhanh')
      ON CONFLICT (location_id) DO NOTHING
    `, [cleanLocationId])

    // 3. Cập nhật vị trí kệ cho thùng
    await client.query(`
      UPDATE cartons 
      SET location_id = $1, status = 'STORED', stored_at = CURRENT_TIMESTAMP
      WHERE carton_id = $2
    `, [cleanLocationId, cleanCartonId])

    // 4. Thừa kế vị trí: cập nhật toàn bộ item con trong thùng
    const updateItemsRes = await client.query(`
      UPDATE carton_items 
      SET location_id = $1 
      WHERE carton_id = $2
    `, [cleanLocationId, cleanCartonId])

    // 5. Ghi log
    await client.query(`
      INSERT INTO scan_audit_logs (barcode, scan_action, status, message)
      VALUES ($1, 'PUTAWAY_CARTON', 'SUCCESS', $2)
    `, [cleanCartonId, `Cất thùng lên kệ ${cleanLocationId} (${updateItemsRes.rowCount} item thừa kế)`])

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Đã cất thùng ${cleanCartonId} lên kệ ${cleanLocationId} (${updateItemsRes.rowCount} phụ liệu thừa kế vị trí)`,
      data: {
        cartonId: cleanCartonId,
        locationId: cleanLocationId,
        updatedItemsCount: updateItemsRes.rowCount
      }
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})

// POST /api/putaway/item - Cất lẻ từng gói phụ liệu (Pick to Bin)
putawayRouter.post('/item', async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    const { childBarcode, locationId } = req.body
    if (!childBarcode || !locationId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tem hoặc vị trí kệ' })
    }

    const cleanBarcode = childBarcode.trim().toUpperCase()
    const cleanLocationId = locationId.trim().toUpperCase()

    await client.query('BEGIN')

    const itemRes = await client.query(`SELECT * FROM carton_items WHERE child_barcode = $1 FOR UPDATE`, [cleanBarcode])
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Không tìm thấy tem phụ liệu ${cleanBarcode}` })
    }

    const oldItem = itemRes.rows[0]

    // Đảm bảo location tồn tại
    await client.query(`
      INSERT INTO locations (location_id, zone, rack, bin, description)
      VALUES ($1, 'Khu Chờ', $1, 'Tầng 1', 'Vị trí kệ tạo nhanh')
      ON CONFLICT (location_id) DO NOTHING
    `, [cleanLocationId])

    // Cập nhật vị trí riêng cho item
    await client.query(`
      UPDATE carton_items 
      SET location_id = $1 
      WHERE child_barcode = $2
    `, [cleanLocationId, cleanBarcode])

    // Ghi log
    await client.query(`
      INSERT INTO scan_audit_logs (barcode, scan_action, status, message)
      VALUES ($1, 'PUTAWAY_ITEM', 'SUCCESS', $2)
    `, [cleanBarcode, `Cất lẻ phụ liệu lên kệ ${cleanLocationId} (Rời thùng ${oldItem.carton_id || 'N/A'})`])

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Đã cất lẻ phụ liệu ${cleanBarcode} vào kệ ${cleanLocationId}`,
      data: {
        childBarcode: cleanBarcode,
        locationId: cleanLocationId
      }
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})
