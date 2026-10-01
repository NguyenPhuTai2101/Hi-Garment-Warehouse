import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const cartonsRouter = Router()

// GET /api/cartons - Danh sách toàn bộ các thùng carton
cartonsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, q } = req.query
    let query = `
      SELECT 
        c.carton_id AS "cartonId",
        c.location_id AS "locationId",
        c.status,
        c.total_items_count AS "totalItemsCount",
        TO_CHAR(c.created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt",
        TO_CHAR(c.closed_at, 'YYYY-MM-DD HH24:MI') AS "closedAt",
        TO_CHAR(c.stored_at, 'YYYY-MM-DD HH24:MI') AS "storedAt",
        COUNT(i.item_id)::int AS "actualItemsCount"
      FROM cartons c
      LEFT JOIN carton_items i ON c.carton_id = i.carton_id
      WHERE 1=1
    `
    const params: any[] = []

    if (status && status !== 'ALL') {
      params.push(status)
      query += ` AND c.status = $${params.length}`
    }

    if (q) {
      params.push(`%${String(q).trim()}%`)
      query += ` AND (c.carton_id ILIKE $${params.length} OR c.location_id ILIKE $${params.length})`
    }

    query += ` GROUP BY c.carton_id ORDER BY c.created_at DESC`

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/cartons/:id - Chi tiết thùng và danh sách phụ liệu bên trong
cartonsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const cartonResult = await pool.query(`
      SELECT 
        carton_id AS "cartonId",
        location_id AS "locationId",
        status,
        total_items_count AS "totalItemsCount",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        TO_CHAR(closed_at, 'YYYY-MM-DD HH24:MI:SS') AS "closedAt",
        TO_CHAR(stored_at, 'YYYY-MM-DD HH24:MI:SS') AS "storedAt"
      FROM cartons
      WHERE carton_id = $1
    `, [id.toUpperCase()])

    if (cartonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy thùng ${id}` })
    }

    const itemsResult = await pool.query(`
      SELECT 
        item_id AS "id",
        child_barcode AS "childBarcode",
        carton_id AS "cartonId",
        order_id AS "orderId",
        style_code AS "styleCode",
        item_code AS "itemCode",
        item_name AS "itemName",
        qty::float AS "qty",
        unit,
        quality_status AS "qualityStatus",
        location_id AS "locationId",
        TO_CHAR(scanned_at, 'YYYY-MM-DD HH24:MI:SS') AS "scannedAt"
      FROM carton_items
      WHERE carton_id = $1
      ORDER BY scanned_at DESC
    `, [id.toUpperCase()])

    res.json({
      success: true,
      data: {
        ...cartonResult.rows[0],
        items: itemsResult.rows
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/cartons/activate - Kích hoạt hoặc tạo mới thùng cha
cartonsRouter.post('/activate', async (req: Request, res: Response) => {
  try {
    const { cartonId } = req.body
    if (!cartonId || !cartonId.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu mã thùng (Carton ID)' })
    }

    const cleanId = cartonId.trim().toUpperCase()

    // Kiểm tra xem thùng đã có trong DB chưa
    const existing = await pool.query(`SELECT * FROM cartons WHERE carton_id = $1`, [cleanId])

    if (existing.rows.length === 0) {
      // Tạo mới thùng
      await pool.query(`
        INSERT INTO cartons (carton_id, status, total_items_count)
        VALUES ($1, 'OPEN', 0)
      `, [cleanId])
    }

    // Lấy thông tin mới nhất
    const carton = await pool.query(`
      SELECT 
        carton_id AS "cartonId",
        location_id AS "locationId",
        status,
        total_items_count AS "totalItemsCount",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM cartons WHERE carton_id = $1
    `, [cleanId])

    const items = await pool.query(`
      SELECT 
        item_id AS "id",
        child_barcode AS "childBarcode",
        carton_id AS "cartonId",
        order_id AS "orderId",
        style_code AS "styleCode",
        item_code AS "itemCode",
        item_name AS "itemName",
        qty::float AS "qty",
        unit,
        quality_status AS "qualityStatus",
        location_id AS "locationId",
        TO_CHAR(scanned_at, 'YYYY-MM-DD HH24:MI:SS') AS "scannedAt"
      FROM carton_items WHERE carton_id = $1
      ORDER BY scanned_at DESC
    `, [cleanId])

    res.json({
      success: true,
      data: {
        ...carton.rows[0],
        items: items.rows
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/cartons/scan-item - Quét tem phụ liệu con vào thùng (Dùng Transaction)
cartonsRouter.post('/scan-item', async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    const { cartonId, barcode } = req.body
    if (!cartonId || !barcode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã thùng hoặc mã tem phụ liệu' })
    }

    const cleanCartonId = cartonId.trim().toUpperCase()
    const cleanBarcode = barcode.trim().toUpperCase()

    await client.query('BEGIN')

    // 1. Kiểm tra thùng có tồn tại không
    const cartonRes = await client.query(`SELECT * FROM cartons WHERE carton_id = $1 FOR UPDATE`, [cleanCartonId])
    if (cartonRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Thùng ${cleanCartonId} không tồn tại` })
    }

    // 2. Kiểm tra trùng tem phụ liệu
    const dupRes = await client.query(`SELECT * FROM carton_items WHERE child_barcode = $1`, [cleanBarcode])
    if (dupRes.rows.length > 0) {
      const existing = dupRes.rows[0]
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: `Mã tem ${cleanBarcode} đã được quét trước đó vào thùng ${existing.carton_id}!`
      })
    }

    // 3. Tự động tìm kiếm Phiếu Giám Định & Dòng phụ liệu còn thiếu
    // Lấy toàn bộ các dòng phụ liệu chưa hoàn thành
    const candidateRes = await client.query(`
      SELECT 
        d.detail_id,
        d.order_id,
        d.item_code,
        d.item_name,
        d.unit,
        d.planned_qty,
        d.received_qty,
        o.style_code
      FROM inspection_order_details d
      JOIN inspection_orders o ON d.order_id = o.order_id
      WHERE o.status != 'COMPLETED'
      ORDER BY d.detail_id ASC
      FOR UPDATE
    `)

    // Chuẩn hóa mã barcode quét được: loại bỏ tiền tố ITEM-, ACC-, và hậu tố số serial -001, -002...
    const cleanKey = cleanBarcode.replace(/^(ITEM|ACC)-/i, '').replace(/-\d+$/, '').trim()
    const tokens = cleanKey.split(/[-_\s]+/).filter(t => t.length > 1)

    let matched: any = null

    // 3.1: Kiểm tra khớp trực tiếp mã hoặc chứa chuỗi
    for (const row of candidateRes.rows) {
      const code = row.item_code.toUpperCase()
      if (cleanBarcode.includes(code) || code.includes(cleanKey)) {
        if (parseFloat(row.received_qty) < parseFloat(row.planned_qty)) {
          matched = row
          break
        } else if (!matched) {
          matched = row
        }
      }
    }

    // 3.2: Kiểm tra theo tập từ khóa (Tokens) - VD: BO, CO, POLO khớp BO-CO-POLO-DEN
    if (!matched && tokens.length > 0) {
      for (const row of candidateRes.rows) {
        const code = row.item_code.toUpperCase()
        const name = row.item_name.toUpperCase()
        const matchTokens = tokens.filter(t => code.includes(t) || name.includes(t))

        // Khớp ít nhất 2 từ khóa hoặc toàn bộ từ khóa
        if (matchTokens.length >= Math.min(2, tokens.length)) {
          if (parseFloat(row.received_qty) < parseFloat(row.planned_qty)) {
            matched = row
            break
          } else if (!matched) {
            matched = row
          }
        }
      }
    }

    if (!matched) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: `Không tìm thấy phụ liệu nào trong các Phiếu Giám Định đang mở khớp với mã tem: ${cleanBarcode}`
      })
    }

    // 4. Cập nhật received_qty trong inspection_order_details
    const updatedReceivedQty = parseFloat(matched.received_qty) + 1
    await client.query(`
      UPDATE inspection_order_details 
      SET received_qty = $1 
      WHERE detail_id = $2
    `, [updatedReceivedQty, matched.detail_id])

    // Kiểm tra xem đơn hàng đã hoàn tất chưa
    const pendingDetailsRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM inspection_order_details 
      WHERE order_id = $1 AND received_qty < planned_qty
    `, [matched.order_id])

    const remainingCount = parseInt(pendingDetailsRes.rows[0].count, 10)
    const newOrderStatus = remainingCount === 0 ? 'COMPLETED' : 'IN_PROGRESS'
    await client.query(`
      UPDATE inspection_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = $2
    `, [newOrderStatus, matched.order_id])

    // 5. Thêm vào carton_items
    const insertItemRes = await client.query(`
      INSERT INTO carton_items (
        child_barcode, carton_id, order_id, detail_id, style_code, 
        item_code, item_name, qty, unit, quality_status, scanned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1.0, $8, 'PASS', CURRENT_TIMESTAMP)
      RETURNING item_id AS "id", child_barcode AS "childBarcode", carton_id AS "cartonId",
                order_id AS "orderId", style_code AS "styleCode", item_code AS "itemCode",
                item_name AS "itemName", qty::float AS "qty", unit, quality_status AS "qualityStatus",
                TO_CHAR(scanned_at, 'YYYY-MM-DD HH24:MI:SS') AS "scannedAt"
    `, [
      cleanBarcode, cleanCartonId, matched.order_id, matched.detail_id, 
      matched.style_code, matched.item_code, matched.item_name, matched.unit
    ])

    // 6. Tăng total_items_count trong cartons
    await client.query(`
      UPDATE cartons 
      SET total_items_count = total_items_count + 1, status = 'OPEN' 
      WHERE carton_id = $1
    `, [cleanCartonId])

    // 7. Ghi nhật ký scan_audit_logs
    await client.query(`
      INSERT INTO scan_audit_logs (barcode, scan_action, status, message)
      VALUES ($1, 'SCAN_CHILD_ITEM', 'SUCCESS', $2)
    `, [cleanBarcode, `Nhận vào thùng ${cleanCartonId} - Đơn: ${matched.style_code}`])

    await client.query('COMMIT')

    res.json({
      success: true,
      data: {
        item: insertItemRes.rows[0],
        orderProgress: {
          orderId: matched.order_id,
          styleCode: matched.style_code,
          itemCode: matched.item_code,
          receivedQty: updatedReceivedQty,
          plannedQty: parseFloat(matched.planned_qty),
          unit: matched.unit
        }
      }
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Scan item error:', err)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})

// POST /api/cartons/close - Đóng thùng
cartonsRouter.post('/close', async (req: Request, res: Response) => {
  try {
    const { cartonId } = req.body
    if (!cartonId) return res.status(400).json({ success: false, message: 'Thiếu mã thùng' })

    const cleanId = cartonId.trim().toUpperCase()
    await pool.query(`
      UPDATE cartons 
      SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP 
      WHERE carton_id = $1
    `, [cleanId])

    res.json({ success: true, message: `Đã đóng thùng ${cleanId}` })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})
