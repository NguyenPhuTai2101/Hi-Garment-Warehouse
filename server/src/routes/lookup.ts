import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const lookupRouter = Router()

// GET /api/lookup/:code - Tra cứu nhanh mã thùng (Lib_RO) hoặc mã tem phụ liệu (WH_ChiTietPhieuGiamDinh_Cay)
lookupRouter.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params
    const cleanCode = code.trim().toUpperCase()

    // 1. Thử tìm Thùng Carton (Lib_RO)
    const cartonRes = await pool.query(`
      SELECT 
        r.MaRo AS "cartonId",
        COALESCE(r.TenViTri, v.TenViTri) AS "locationId",
        r.TrangThaiRo AS "status",
        r.TongSoCay AS "totalItemsCount",
        TO_CHAR(r.NgayTao, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM Lib_RO r
      LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
      WHERE r.MaRo = $1
    `, [cleanCode])

    if (cartonRes.rows.length > 0) {
      const itemsRes = await pool.query(`
        SELECT 
          c.CayId AS "id",
          c.MaCay AS "childBarcode",
          c.MaRo AS "cartonId",
          pgd.MaPhieu AS "orderId",
          pgd.MaHang AS "styleCode",
          npl.Item AS "itemCode",
          npl.DienGiai AS "itemName",
          c.SL::float AS "qty",
          npl.DVT AS "unit",
          'PASS' AS "qualityStatus",
          COALESCE(r.TenViTri, v.TenViTri) AS "locationId",
          TO_CHAR(c.NgayQuet, 'YYYY-MM-DD HH24:MI:SS') AS "scannedAt"
        FROM WH_ChiTietPhieuGiamDinh_Cay c
        JOIN WH_ChiTietPhieuGiamDinh ct ON c.CTPGDId = ct.CTPGDId
        JOIN WH_PhieuGiamDinh pgd ON ct.PGDId = pgd.PGDId
        JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
        LEFT JOIN Lib_RO r ON c.MaRo = r.MaRo
        LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
        WHERE c.MaRo = $1
        ORDER BY c.NgayQuet DESC
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

    // 2. Thử tìm Tem Phụ Liệu (WH_ChiTietPhieuGiamDinh_Cay)
    const itemRes = await pool.query(`
      SELECT 
        c.CayId AS "id",
        c.MaCay AS "childBarcode",
        c.MaRo AS "cartonId",
        pgd.MaPhieu AS "orderId",
        pgd.MaHang AS "styleCode",
        npl.Item AS "itemCode",
        npl.DienGiai AS "itemName",
        c.SL::float AS "qty",
        npl.DVT AS "unit",
        'PASS' AS "qualityStatus",
        COALESCE(r.TenViTri, v.TenViTri, 'Chưa lưu kho') AS "locationId",
        TO_CHAR(c.NgayQuet, 'YYYY-MM-DD HH24:MI:SS') AS "scannedAt"
      FROM WH_ChiTietPhieuGiamDinh_Cay c
      JOIN WH_ChiTietPhieuGiamDinh ct ON c.CTPGDId = ct.CTPGDId
      JOIN WH_PhieuGiamDinh pgd ON ct.PGDId = pgd.PGDId
      JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
      LEFT JOIN Lib_RO r ON c.MaRo = r.MaRo
      LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
      WHERE c.MaCay = $1
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
    console.error('Lookup error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})
