import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const lookupRouter = Router()

// GET /api/lookup/:code - Tra cứu nhanh mã thùng hoặc mã tem phụ liệu
lookupRouter.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params
    const cleanCode = code.trim().toUpperCase()

    // 1. Thử tìm Thùng Carton
    const cartonRes = await pool.query(`
      SELECT 
        carton_id AS "cartonId",
        location_id AS "locationId",
        status,
        total_items_count AS "totalItemsCount",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM cartons 
      WHERE carton_id = $1
    `, [cleanCode])

    if (cartonRes.rows.length > 0) {
      const itemsRes = await pool.query(`
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
      `, [cleanCode])

      return res.json({
        success: true,
        type: 'CARTON',
        data: {
          carton: cartonRes.rows[0],
          items: itemsRes.rows
        }
      })
    }

    // 2. Thử tìm Tem Phụ Liệu
    const itemRes = await pool.query(`
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
      WHERE child_barcode = $1
    `, [cleanCode])

    if (itemRes.rows.length > 0) {
      return res.json({
        success: true,
        type: 'ITEM',
        data: {
          item: itemRes.rows[0]
        }
      })
    }

    return res.status(404).json({
      success: false,
      message: `Không tìm thấy thông tin cho mã: ${cleanCode}`
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})
