import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const putawayRouter = Router()

// GET /api/putaway/locations - Danh sách vị trí kệ kho (Lib_ViTriKho)
putawayRouter.get('/locations', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.VTId AS "vtId",
        v.TenViTri AS "locationId",
        COALESCE(k.TenKho, 'Kho BGG') AS "zone",
        v.TenViTri AS "rack",
        'Tầng 1' AS "bin",
        COALESCE(v.MoTa, 'Vị trí kệ tiêu chuẩn') AS "description"
      FROM Lib_ViTriKho v
      LEFT JOIN Lib_DanhSachKho k ON v.KId = k.KId
      ORDER BY v.TenViTri ASC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err: any) {
    console.error('Error fetching locations:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/putaway/carton - Cất nguyên thùng/rọ lên kệ (Lib_RO -> Lib_ViTriKho)
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

    // 1. Kiểm tra tồn tại rọ
    const cartonRes = await client.query(`SELECT * FROM Lib_RO WHERE MaRo = $1 FOR UPDATE`, [cleanCartonId])
    if (cartonRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Thùng/Rọ ${cleanCartonId} không tồn tại` })
    }

    // 2. Đảm bảo vị trí tồn tại trong Lib_ViTriKho và lấy VTId
    let locRes = await client.query(`SELECT VTId FROM Lib_ViTriKho WHERE TenViTri = $1`, [cleanLocationId])
    let vtId: number
    if (locRes.rows.length === 0) {
      const maxIdRes = await client.query(`SELECT COALESCE(MAX(VTId), 0) + 1 AS next_id FROM Lib_ViTriKho`)
      vtId = parseInt(maxIdRes.rows[0].next_id, 10)
      await client.query(`
        INSERT INTO Lib_ViTriKho (VTId, TenViTri, KId, MoTa)
        VALUES ($1, $2, 1, 'Vị trí kệ tạo nhanh')
        ON CONFLICT (TenViTri) DO NOTHING
      `, [vtId, cleanLocationId])
    } else {
      vtId = locRes.rows[0].vtid
    }

    // 3. Cập nhật vị trí kệ cho rọ (Theo chuẩn proc lib_NPL_CapNhatViTri_New)
    await client.query(`
      UPDATE Lib_RO 
      SET 
        TenViTri = $1,
        VTId = $2,
        TrangThaiRo = 'STORED',
        NgayCapNhatViTri = CURRENT_TIMESTAMP,
        NguoiCapNhatViTri = 'PDA_USER'
      WHERE MaRo = $3
    `, [cleanLocationId, vtId, cleanCartonId])

    // 4. Đếm số lượng tem phụ liệu trong thùng thừa kế vị trí này
    const itemsCountRes = await client.query(`
      SELECT COUNT(*)::int AS count 
      FROM WH_ChiTietPhieuGiamDinh_Cay 
      WHERE MaRo = $1
    `, [cleanCartonId])
    const itemCount = itemsCountRes.rows[0].count

    // 5. Ghi log hệ thống Sys_Log
    await client.query(`
      INSERT INTO Sys_Log (TypeLog, ContentLog, UserName)
      VALUES ($1, $2, 'PDA_USER')
    `, ['PUTAWAY_CARTON', `Cất thùng ${cleanCartonId} lên kệ ${cleanLocationId} (${itemCount} phụ liệu thừa kế vị trí)`])

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Đã cất thùng ${cleanCartonId} lên kệ ${cleanLocationId} (${itemCount} phụ liệu thừa kế vị trí)`,
      data: {
        cartonId: cleanCartonId,
        locationId: cleanLocationId,
        updatedItemsCount: itemCount
      }
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Putaway carton error:', err)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})

// POST /api/putaway/item - Cất lẻ từng gói phụ liệu (Pick to Bin / Rời rọ)
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

    const itemRes = await client.query(`
      SELECT * FROM WH_ChiTietPhieuGiamDinh_Cay 
      WHERE MaCay = $1 FOR UPDATE
    `, [cleanBarcode])

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Không tìm thấy tem phụ liệu ${cleanBarcode}` })
    }

    const oldItem = itemRes.rows[0]
    const oldMaRo = oldItem.maro

    // Đảm bảo vị trí tồn tại trong Lib_ViTriKho
    let locRes = await client.query(`SELECT VTId FROM Lib_ViTriKho WHERE TenViTri = $1`, [cleanLocationId])
    if (locRes.rows.length === 0) {
      const maxIdRes = await client.query(`SELECT COALESCE(MAX(VTId), 0) + 1 AS next_id FROM Lib_ViTriKho`)
      const nextId = parseInt(maxIdRes.rows[0].next_id, 10)
      await client.query(`
        INSERT INTO Lib_ViTriKho (VTId, TenViTri, KId, MoTa)
        VALUES ($1, $2, 1, 'Vị trí kệ tạo nhanh')
        ON CONFLICT (TenViTri) DO NOTHING
      `, [nextId, cleanLocationId])
    }

    // Cập nhật rời rọ cho cây phụ liệu (MaRo = NULL)
    await client.query(`
      UPDATE WH_ChiTietPhieuGiamDinh_Cay 
      SET MaRo = NULL, NgayCapNhatRo = CURRENT_TIMESTAMP, NguoiCapNhatRo = 'PDA_USER'
      WHERE MaCay = $1
    `, [cleanBarcode])

    // Xử lý rọ cũ theo proc lib_NPL_CapNhatViTri_New:
    // Nếu rọ cũ không còn cây nào có tồn (SL - SoLuongXuat > 0), set vị trí = null
    if (oldMaRo) {
      const remainingRes = await client.query(`
        SELECT COUNT(*)::int AS count 
        FROM WH_ChiTietPhieuGiamDinh_Cay 
        WHERE MaRo = $1 AND (SL - COALESCE(SoLuongXuat, 0) > 0)
      `, [oldMaRo])
      
      const remainingCount = remainingRes.rows[0].count

      if (remainingCount === 0) {
        await client.query(`
          UPDATE Lib_RO 
          SET TenViTri = NULL, VTId = NULL, TrangThaiRo = 'EMPTY', TongSoCay = 0 
          WHERE MaRo = $1
        `, [oldMaRo])
      } else {
        await client.query(`
          UPDATE Lib_RO 
          SET TongSoCay = $1 
          WHERE MaRo = $2
        `, [remainingCount, oldMaRo])
      }
    }

    // Ghi log hệ thống Sys_Log
    await client.query(`
      INSERT INTO Sys_Log (TypeLog, ContentLog, UserName)
      VALUES ($1, $2, 'PDA_USER')
    `, ['PUTAWAY_ITEM', `Cất lẻ phụ liệu ${cleanBarcode} lên kệ ${cleanLocationId} (Rời rọ ${oldMaRo || 'N/A'})`])

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `Đã cất lẻ phụ liệu ${cleanBarcode} vào kệ ${cleanLocationId} (Rời rọ ${oldMaRo || 'N/A'})`,
      data: {
        childBarcode: cleanBarcode,
        locationId: cleanLocationId
      }
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('Putaway item error:', err)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
})
