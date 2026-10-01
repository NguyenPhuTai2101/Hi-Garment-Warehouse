import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const ordersRouter = Router()

// GET /api/orders - Lấy danh sách phiếu giám định kèm chi tiết phụ liệu
ordersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        order_id AS "orderId",
        style_code AS "styleCode",
        po_number AS "poNumber",
        vendor_name AS "vendor",
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdDate"
      FROM inspection_orders
      ORDER BY created_at DESC
    `)

    const detailsResult = await pool.query(`
      SELECT 
        detail_id AS "id",
        order_id AS "orderId",
        item_code AS "itemCode",
        item_name AS "itemName",
        unit,
        planned_qty::float AS "plannedQty",
        received_qty::float AS "receivedQty"
      FROM inspection_order_details
      ORDER BY detail_id ASC
    `)

    const orders = ordersResult.rows.map((order: any) => {
      const items = detailsResult.rows.filter((d: any) => d.orderId === order.orderId)
      return {
        ...order,
        items
      }
    })

    res.json({ success: true, data: orders })
  } catch (err: any) {
    console.error('Error fetching orders:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/orders/:id - Chi tiết 1 phiếu giám định
ordersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const orderResult = await pool.query(`
      SELECT 
        order_id AS "orderId",
        style_code AS "styleCode",
        po_number AS "poNumber",
        vendor_name AS "vendor",
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "createdDate"
      FROM inspection_orders
      WHERE order_id = $1
    `, [id])

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu giám định' })
    }

    const itemsResult = await pool.query(`
      SELECT 
        detail_id AS "id",
        order_id AS "orderId",
        item_code AS "itemCode",
        item_name AS "itemName",
        unit,
        planned_qty::float AS "plannedQty",
        received_qty::float AS "receivedQty"
      FROM inspection_order_details
      WHERE order_id = $1
      ORDER BY detail_id ASC
    `, [id])

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})
