import { Router, Request, Response } from 'express'
import { pool } from '../db'

export const cartonsRouter = Router()

// GET /api/cartons - Danh sách toàn bộ các thùng/rọ carton (Lib_RO)
cartonsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, q } = req.query
    let query = `
      SELECT 
        r.MaRo AS "cartonId",
        COALESCE(r.TenViTri, v.TenViTri) AS "locationId",
        r.TrangThaiRo AS "status",
        r.TongSoCay AS "totalItemsCount",
        TO_CHAR(r.NgayTao, 'YYYY-MM-DD HH24:MI') AS "createdAt",
        TO_CHAR(r.NgayDongThung, 'YYYY-MM-DD HH24:MI') AS "closedAt",
        TO_CHAR(r.NgayCapNhatViTri, 'YYYY-MM-DD HH24:MI') AS "storedAt",
        COUNT(c.CayId)::int AS "actualItemsCount"
      FROM Lib_RO r
      LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
      LEFT JOIN WH_ChiTietPhieuGiamDinh_Cay c ON r.MaRo = c.MaRo
      WHERE 1=1
    `
    const params: any[] = []

    if (status && status !== 'ALL') {
      params.push(status)
      query += ` AND r.TrangThaiRo = $${params.length}`
    }

    if (q) {
      params.push(`%${String(q).trim()}%`)
      query += ` AND (r.MaRo ILIKE $${params.length} OR COALESCE(r.TenViTri, v.TenViTri) ILIKE $${params.length})`
    }

    query += `
      GROUP BY r.MaRo, r.TenViTri, v.TenViTri, r.TrangThaiRo, r.TongSoCay, r.NgayTao, r.NgayDongThung, r.NgayCapNhatViTri
      ORDER BY r.NgayTao DESC
    `

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err: any) {
    console.error('Error fetching cartons:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/cartons/:id - Chi tiết thùng và danh sách phụ liệu bên trong
cartonsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const cleanId = id.trim().toUpperCase()

    const cartonResult = await pool.query(`
      SELECT 
        r.MaRo AS "cartonId",
        COALESCE(r.TenViTri, v.TenViTri) AS "locationId",
        r.TrangThaiRo AS "status",
        r.TongSoCay AS "totalItemsCount",
        TO_CHAR(r.NgayTao, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        TO_CHAR(r.NgayDongThung, 'YYYY-MM-DD HH24:MI:SS') AS "closedAt",
        TO_CHAR(r.NgayCapNhatViTri, 'YYYY-MM-DD HH24:MI:SS') AS "storedAt"
      FROM Lib_RO r
      LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
      WHERE r.MaRo = $1
    `, [cleanId])

    if (cartonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy thùng ${cleanId}` })
    }

    const itemsResult = await pool.query(`
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
    `, [cleanId])

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

// POST /api/cartons/activate - Kích hoạt hoặc tạo mới thùng/rọ
cartonsRouter.post('/activate', async (req: Request, res: Response) => {
  try {
    const { cartonId } = req.body
    if (!cartonId || !cartonId.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu mã thùng (Carton ID)' })
    }

    const cleanId = cartonId.trim().toUpperCase()

    // Kiểm tra xem thùng đã có trong Lib_RO chưa
    const existing = await pool.query(`SELECT * FROM Lib_RO WHERE MaRo = $1`, [cleanId])

    if (existing.rows.length === 0) {
      // Tạo mới thùng rọ
      await pool.query(`
        INSERT INTO Lib_RO (MaRo, TrangThaiRo, TongSoCay, NgayTao)
        VALUES ($1, 'OPEN', 0, CURRENT_TIMESTAMP)
      `, [cleanId])
    }

    // Lấy thông tin mới nhất
    const carton = await pool.query(`
      SELECT 
        r.MaRo AS "cartonId",
        COALESCE(r.TenViTri, v.TenViTri) AS "locationId",
        r.TrangThaiRo AS "status",
        r.TongSoCay AS "totalItemsCount",
        TO_CHAR(r.NgayTao, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM Lib_RO r
      LEFT JOIN Lib_ViTriKho v ON r.VTId = v.VTId
      WHERE r.MaRo = $1
    `, [cleanId])

    const items = await pool.query(`
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

// POST /api/cartons/scan-item - Quét tem phụ liệu con vào thùng (Chuẩn eGMF Transaction)
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

    // 1. Kiểm tra thùng rọ có tồn tại không
    const cartonRes = await client.query(`SELECT * FROM Lib_RO WHERE MaRo = $1 FOR UPDATE`, [cleanCartonId])
    if (cartonRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: `Thùng/Rọ ${cleanCartonId} không tồn tại` })
    }

    const currentCarton = cartonRes.rows[0]
    if (currentCarton.trangthairo === 'CLOSED') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: `Thùng ${cleanCartonId} đã được đóng!` })
    }

    // 2. Kiểm tra tem phụ liệu trong WH_ChiTietPhieuGiamDinh_Cay
    const existingCayRes = await client.query(`
      SELECT c.*, ct.PGDId, ct.SLKiem, ct.SLDat, npl.Item, npl.DienGiai, npl.DVT, pgd.MaPhieu, pgd.MaHang
      FROM WH_ChiTietPhieuGiamDinh_Cay c
      JOIN WH_ChiTietPhieuGiamDinh ct ON c.CTPGDId = ct.CTPGDId
      JOIN WH_PhieuGiamDinh pgd ON ct.PGDId = pgd.PGDId
      JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
      WHERE c.MaCay = $1
      FOR UPDATE
    `, [cleanBarcode])

    let matchedItemInfo: any = null
    let cayId: string | number = ''

    if (existingCayRes.rows.length > 0) {
      const existing = existingCayRes.rows[0]
      // Đã có mã cây trong hệ thống
      if (existing.maro && existing.maro === cleanCartonId) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: `Mã tem ${cleanBarcode} đã có trong thùng ${cleanCartonId}!`
        })
      }

      if (existing.maro && existing.maro !== cleanCartonId) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: `Mã tem ${cleanBarcode} đã thuộc về thùng ${existing.maro}!`
        })
      }

      // Nếu chưa gán vào rọ nào (MaRo is null) -> Gán vào rọ này
      await client.query(`
        UPDATE WH_ChiTietPhieuGiamDinh_Cay 
        SET MaRo = $1, NgayCapNhatRo = CURRENT_TIMESTAMP, NguoiCapNhatRo = 'PDA_USER'
        WHERE CayId = $2
      `, [cleanCartonId, existing.cayid])

      cayId = existing.cayid
      matchedItemInfo = {
        orderId: existing.maphieu,
        styleCode: existing.mahang,
        itemCode: existing.item,
        itemName: existing.diengiai,
        unit: existing.dvt,
        plannedQty: parseFloat(existing.slkiem),
        receivedQty: parseFloat(existing.sldat) || 1
      }
    } else {
      // 3. Nếu chưa có mã cây: Tìm kiếm Phiếu Giám Định hợp lệ (TrangThai = 'DAXACNHAN')
      const candidateRes = await client.query(`
        SELECT 
          ct.CTPGDId,
          ct.PGDId,
          ct.SLKiem,
          ct.SLDat,
          pgd.MaPhieu,
          pgd.MaHang,
          npl.Item,
          npl.DienGiai,
          npl.DVT,
          (SELECT COUNT(*) FROM WH_ChiTietPhieuGiamDinh_Cay c WHERE c.CTPGDId = ct.CTPGDId) AS current_scanned_count
        FROM WH_ChiTietPhieuGiamDinh ct
        JOIN WH_PhieuGiamDinh pgd ON ct.PGDId = pgd.PGDId
        JOIN Lib_NguyenPhuLieu npl ON ct.VTId = npl.VTId
        WHERE pgd.TrangThai = 'DAXACNHAN'
        ORDER BY ct.CTPGDId ASC
        FOR UPDATE
      `)

      // Chuẩn hóa mã barcode quét được: loại bỏ tiền tố ITEM-, ACC-, và hậu tố số serial -001, -002...
      const cleanKey = cleanBarcode.replace(/^(ITEM|ACC)-/i, '').replace(/-\d+$/, '').trim()
      const tokens = cleanKey.split(/[-_\s]+/).filter(t => t.length > 1)

      let matchedDetail: any = null

      // Khớp theo Item code hoặc key
      for (const row of candidateRes.rows) {
        const code = row.item.toUpperCase()
        if (cleanBarcode.includes(code) || code.includes(cleanKey)) {
          if (parseFloat(row.current_scanned_count) < parseFloat(row.slkiem)) {
            matchedDetail = row
            break
          } else if (!matchedDetail) {
            matchedDetail = row
          }
        }
      }

      // Khớp theo Tokens từ khóa
      if (!matchedDetail && tokens.length > 0) {
        for (const row of candidateRes.rows) {
          const code = row.item.toUpperCase()
          const name = row.diengiai.toUpperCase()
          const matchTokens = tokens.filter(t => code.includes(t) || name.includes(t))

          if (matchTokens.length >= Math.min(2, tokens.length)) {
            if (parseFloat(row.current_scanned_count) < parseFloat(row.slkiem)) {
              matchedDetail = row
              break
            } else if (!matchedDetail) {
              matchedDetail = row
            }
          }
        }
      }

      if (!matchedDetail) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy phụ liệu nào trong các Phiếu Giám Định khớp với mã tem: ${cleanBarcode}`
        })
      }

      // Thêm mới vào WH_ChiTietPhieuGiamDinh_Cay
      const insertCayRes = await client.query(`
        INSERT INTO WH_ChiTietPhieuGiamDinh_Cay (
          MaCay, CTPGDId, MaRo, SL, SoLuongXuat, NgayQuet, NgayCapNhatRo, NguoiCapNhatRo
        ) VALUES (
          $1, $2, $3, 1.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'PDA_USER'
        )
        RETURNING CayId
      `, [cleanBarcode, matchedDetail.ctpgdid, cleanCartonId])

      cayId = insertCayRes.rows[0].cayid

      // Cập nhật SLDat trong WH_ChiTietPhieuGiamDinh
      await client.query(`
        UPDATE WH_ChiTietPhieuGiamDinh 
        SET SLDat = SLDat + 1
        WHERE CTPGDId = $1
      `, [matchedDetail.ctpgdid])

      const newScannedCount = parseFloat(matchedDetail.current_scanned_count) + 1

      matchedItemInfo = {
        orderId: matchedDetail.maphieu,
        styleCode: matchedDetail.mahang,
        itemCode: matchedDetail.item,
        itemName: matchedDetail.diengiai,
        unit: matchedDetail.dvt,
        plannedQty: parseFloat(matchedDetail.slkiem),
        receivedQty: newScannedCount
      }
    }

    // 4. Cập nhật số lượng trong Lib_RO
    await client.query(`
      UPDATE Lib_RO 
      SET TongSoCay = (SELECT COUNT(*) FROM WH_ChiTietPhieuGiamDinh_Cay WHERE MaRo = $1),
          TrangThaiRo = 'OPEN'
      WHERE MaRo = $1
    `, [cleanCartonId])

    // 5. Ghi log hệ thống Sys_Log
    await client.query(`
      INSERT INTO Sys_Log (TypeLog, ContentLog, UserName)
      VALUES ($1, $2, 'PDA_USER')
    `, ['SCAN_CHILD_ITEM', `Đã quét tem ${cleanBarcode} vào thùng ${cleanCartonId} - Đơn: ${matchedItemInfo.styleCode}`])

    await client.query('COMMIT')

    res.json({
      success: true,
      data: {
        item: {
          id: cayId,
          childBarcode: cleanBarcode,
          cartonId: cleanCartonId,
          orderId: matchedItemInfo.orderId,
          styleCode: matchedItemInfo.styleCode,
          itemCode: matchedItemInfo.itemCode,
          itemName: matchedItemInfo.itemName,
          qty: 1.0,
          unit: matchedItemInfo.unit,
          qualityStatus: 'PASS',
          scannedAt: new Date().toISOString()
        },
        orderProgress: {
          orderId: matchedItemInfo.orderId,
          styleCode: matchedItemInfo.styleCode,
          itemCode: matchedItemInfo.itemCode,
          receivedQty: matchedItemInfo.receivedQty,
          plannedQty: matchedItemInfo.plannedQty,
          unit: matchedItemInfo.unit
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

// POST /api/cartons/close - Đóng thùng (Lib_RO)
cartonsRouter.post('/close', async (req: Request, res: Response) => {
  try {
    const { cartonId } = req.body
    if (!cartonId) return res.status(400).json({ success: false, message: 'Thiếu mã thùng' })

    const cleanId = cartonId.trim().toUpperCase()
    await pool.query(`
      UPDATE Lib_RO 
      SET TrangThaiRo = 'CLOSED', NgayDongThung = CURRENT_TIMESTAMP 
      WHERE MaRo = $1
    `, [cleanId])

    await pool.query(`
      INSERT INTO Sys_Log (TypeLog, ContentLog, UserName)
      VALUES ('CLOSE_CARTON', $1, 'PDA_USER')
    `, [`Đã đóng thùng ${cleanId}`])

    res.json({ success: true, message: `Đã đóng thùng ${cleanId}` })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})
