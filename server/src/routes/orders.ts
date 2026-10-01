import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const ordersRouter = Router()

// GET /api/orders - Lấy danh sách phiếu giám định theo chuẩn production eGMF
ordersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        p.PGDId AS "orderId",
        p.MaPhieu AS "orderCode",
        p.MaHang AS "styleCode",
        p.DanhSachPO AS "poNumber",
        COALESCE(kh.TenDayDu, kh.TenNgan, 'N/A') AS "vendor",
        p.TrangThai AS "status",
        TO_CHAR(p.NgayGiamDinh, 'YYYY-MM-DD HH24:MI') AS "createdDate"
      FROM WH_PhieuGiamDinh p
      LEFT JOIN Lib_KhachHang kh ON p.KHId = kh.KHId
      ORDER BY p.NgayGiamDinh DESC
    `)

    const detailsResult = await pool.query(`
      SELECT 
        ct.CTPGDId AS "id",
        ct.PGDId AS "orderId",
        npl.Item AS "itemCode",
        npl.DienGiai AS "itemName",
        npl.DVT AS "unit",
        ct.SLKiem::float AS "plannedQty",
        (SELECT COUNT(*)::float FROM WH_ChiTietPhieuGiamDinh_Cay WHERE CTPGDId = ct.CTPGDId) AS "receivedQty"
      FROM WH_ChiTietPhieuGiamDinh ct
      JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
      ORDER BY ct.CTPGDId ASC
    `)

    const orders = ordersResult.rows.map((order: any) => {
      const items = detailsResult.rows.filter((d: any) => String(d.orderId) === String(order.orderId))
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
        p.PGDId AS "orderId",
        p.MaPhieu AS "orderCode",
        p.MaHang AS "styleCode",
        p.DanhSachPO AS "poNumber",
        COALESCE(kh.TenDayDu, kh.TenNgan, 'N/A') AS "vendor",
        p.TrangThai AS "status",
        TO_CHAR(p.NgayGiamDinh, 'YYYY-MM-DD HH24:MI') AS "createdDate"
      FROM WH_PhieuGiamDinh p
      LEFT JOIN Lib_KhachHang kh ON p.KHId = kh.KHId
      WHERE p.PGDId::text = $1 OR p.MaPhieu = $1
    `, [id])

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu giám định' })
    }

    const pgdId = orderResult.rows[0].orderId

    const itemsResult = await pool.query(`
      SELECT 
        ct.CTPGDId AS "id",
        ct.PGDId AS "orderId",
        npl.Item AS "itemCode",
        npl.DienGiai AS "itemName",
        npl.DVT AS "unit",
        ct.SLKiem::float AS "plannedQty",
        (SELECT COUNT(*)::float FROM WH_ChiTietPhieuGiamDinh_Cay WHERE CTPGDId = ct.CTPGDId) AS "receivedQty"
      FROM WH_ChiTietPhieuGiamDinh ct
      JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
      WHERE ct.PGDId = $1
      ORDER BY ct.CTPGDId ASC
    `, [pgdId])

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
