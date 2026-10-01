-- ==============================================================================
-- DATABASE SCHEMA: HỆ THỐNG KHO PHỤ LIỆU MAY MẶC BGG (MÔ PHỎNG CHUẨN PRODUCTION eGMF)
-- ĐỒNG BỘ CẤU TRÚC VỚI 3 STORED PROCEDURE:
-- 1. [wh_DanhSachPhieuGiamDinhTheoThoiGian]
-- 2. [WH_ChiTietPhieuGiamDinh_PGDId]
-- 3. [lib_NPL_CapNhatViTri_New]
-- ==============================================================================

-- Xóa các bảng cũ nếu cần thiết kế lại đồng bộ
DROP TABLE IF EXISTS scan_audit_logs CASCADE;
DROP TABLE IF EXISTS WH_ChiTietPhieuGiamDinh_Cay CASCADE;
DROP TABLE IF EXISTS WH_ChiTietPhieuGiamDinh CASCADE;
DROP TABLE IF EXISTS WH_PhieuGiamDinh CASCADE;
DROP TABLE IF EXISTS Lib_NguyenPhuLieu CASCADE;
DROP TABLE IF EXISTS Lib_RO CASCADE;
DROP TABLE IF EXISTS Lib_ViTriKho CASCADE;
DROP TABLE IF EXISTS Lib_DanhSachKho CASCADE;
DROP TABLE IF EXISTS Lib_KhachHang CASCADE;
DROP TABLE IF EXISTS carton_items CASCADE;
DROP TABLE IF EXISTS cartons CASCADE;
DROP TABLE IF EXISTS inspection_order_details CASCADE;
DROP TABLE IF EXISTS inspection_orders CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- 1. DANH MỤC KHO (Lib_DanhSachKho)
CREATE TABLE Lib_DanhSachKho (
    KId INT PRIMARY KEY,
    MaKho VARCHAR(50) NOT NULL UNIQUE,
    TenKho VARCHAR(255) NOT NULL
);

-- 2. DANH MỤC KHÁCH HÀNG / NHÀ CUNG CẤP (Lib_KhachHang)
CREATE TABLE Lib_KhachHang (
    KHId BIGINT PRIMARY KEY,
    MaKhachHang VARCHAR(50) NOT NULL UNIQUE,
    TenDayDu VARCHAR(255) NOT NULL,
    TenNgan VARCHAR(100)
);

-- 3. DANH MỤC VỊ TRÍ KHO KỆ (Lib_ViTriKho)
CREATE TABLE Lib_ViTriKho (
    VTId BIGINT PRIMARY KEY,
    TenViTri VARCHAR(50) NOT NULL UNIQUE,
    KId INT REFERENCES Lib_DanhSachKho(KId),
    MoTa TEXT
);

-- 4. DANH MỤC NGUYÊN PHỤ LIỆU (Lib_NguyenPhuLieu)
CREATE TABLE Lib_NguyenPhuLieu (
    VTId BIGINT PRIMARY KEY,
    Item VARCHAR(100) NOT NULL, -- ItemCode (CHI-DEN-40, KHOA-DONG...)
    DienGiai VARCHAR(255) NOT NULL, -- Tên chủng loại NPL
    MaChungLoai VARCHAR(50),
    DVT VARCHAR(50) NOT NULL, -- Cuộn, Bịch, Cái, Mét...
    Size VARCHAR(50),
    MaMau VARCHAR(50),
    LoaiNPL VARCHAR(50) DEFAULT 'PhuLieu',
    DHId BIGINT -- Mã đơn hàng liên quan
);

-- 5. DANH MỤC RỌ / THÙNG CARTON (Lib_RO)
-- Đại diện cho Vỏ Thùng Carton (Carton ID) trong mô hình Parent-Child
CREATE TABLE Lib_RO (
    MaRo VARCHAR(50) PRIMARY KEY, -- Mã Thùng / Rọ (VD: TH-00101, NA-00001)
    VTId BIGINT REFERENCES Lib_ViTriKho(VTId), -- Vị trí kệ lưu trữ Rọ
    TenViTri VARCHAR(50), -- Tên vị trí kệ hiển thị
    KId INT REFERENCES Lib_DanhSachKho(KId),
    TrangThaiRo VARCHAR(30) DEFAULT 'OPEN' CHECK (TrangThaiRo IN ('OPEN', 'CLOSED', 'STORED', 'EMPTY')),
    TongSoCay INT DEFAULT 0, -- Số lượng gói/cuộn phụ liệu trong rọ
    NguoiCapNhatViTri VARCHAR(100),
    NgayCapNhatViTri TIMESTAMPTZ,
    NgayTao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    NgayDongThung TIMESTAMPTZ
);

-- 6. PHIẾU GIÁM ĐỊNH (WH_PhieuGiamDinh)
CREATE TABLE WH_PhieuGiamDinh (
    PGDId BIGINT PRIMARY KEY,
    MaPhieu VARCHAR(50) NOT NULL UNIQUE,
    KHId BIGINT REFERENCES Lib_KhachHang(KHId),
    KId INT REFERENCES Lib_DanhSachKho(KId),
    VTId BIGINT REFERENCES Lib_ViTriKho(VTId), -- Vị trí kho đệm nếu có
    DHId BIGINT,
    MaHang VARCHAR(100) NOT NULL, -- Mã hàng may mặc (Áo khoác, Sơ mi...)
    LoaiGiamDinh VARCHAR(50) DEFAULT 'PhuLieu',
    TrangThai VARCHAR(50) DEFAULT 'DAXACNHAN', -- Theo proc BGG: phải DAXACNHAN mới cho gán rọ
    HangDangTrenXe INT DEFAULT 0, -- 1: Đang trên xe, 0: Đã vào kho kiểm
    NguoiGiamDinh VARCHAR(100) DEFAULT 'QC User',
    NgayGiamDinh TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    NgayNhanNL TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    GhiChu TEXT,
    DanhSachPO VARCHAR(255)
);

-- 7. CHI TIẾT PHIẾU GIÁM ĐỊNH (WH_ChiTietPhieuGiamDinh)
CREATE TABLE WH_ChiTietPhieuGiamDinh (
    CTPGDId BIGINT PRIMARY KEY,
    PGDId BIGINT NOT NULL REFERENCES WH_PhieuGiamDinh(PGDId) ON DELETE CASCADE,
    VTId BIGINT NOT NULL REFERENCES Lib_NguyenPhuLieu(VTId),
    SoPO VARCHAR(50),
    PONo VARCHAR(50),
    SLKiem NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Số lượng mua / cần kiểm
    SLDat NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- Số lượng kiểm đạt
    SLKDat NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Số lượng không đạt
    ChungTu VARCHAR(100),
    Lot VARCHAR(100),
    Kho VARCHAR(50),
    GhiChu TEXT
);

-- 8. CHI TIẾT CÂY / CUỘN / BỊCH PHỤ LIỆU THỰC TẾ (WH_ChiTietPhieuGiamDinh_Cay)
-- Đây là bảng lưu tem phụ liệu con (Child Barcode) theo chuẩn proc BGG
CREATE TABLE WH_ChiTietPhieuGiamDinh_Cay (
    CayId BIGSERIAL PRIMARY KEY,
    MaCay VARCHAR(100) NOT NULL UNIQUE, -- Mã tem phụ liệu duy nhất (Child Barcode)
    QrTrangMapping VARCHAR(100),
    CTPGDId BIGINT NOT NULL REFERENCES WH_ChiTietPhieuGiamDinh(CTPGDId),
    MaRo VARCHAR(50) REFERENCES Lib_RO(MaRo) ON DELETE SET NULL, -- Mã thùng/rọ chứa nó
    SL NUMERIC(12, 2) NOT NULL DEFAULT 1.0, -- Số lượng phụ liệu trong gói này (VD: 1 cuộn, 100 cái)
    SoLuongXuat NUMERIC(12, 2) DEFAULT 0.0, -- Số lượng đã xuất
    SoMet NUMERIC(12, 2) DEFAULT 0.0,
    SoYard NUMERIC(12, 2) DEFAULT 0.0,
    NguoiCapNhatRo VARCHAR(100) DEFAULT 'PDA_USER',
    NgayCapNhatRo TIMESTAMPTZ,
    NgayQuet TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. BẢNG AUDIT LOG HỆ THỐNG (Mô phỏng eGMF_Log.Sys_Log)
CREATE TABLE Sys_Log (
    LogId BIGSERIAL PRIMARY KEY,
    TypeLog VARCHAR(100) NOT NULL,
    ContentLog TEXT NOT NULL,
    UserName VARCHAR(100) DEFAULT 'PDA_USER',
    DateLog TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES TỐI ƯU HÓA
CREATE INDEX idx_cay_macay ON WH_ChiTietPhieuGiamDinh_Cay(MaCay);
CREATE INDEX idx_cay_maro ON WH_ChiTietPhieuGiamDinh_Cay(MaRo);
CREATE INDEX idx_cay_ctpgdid ON WH_ChiTietPhieuGiamDinh_Cay(CTPGDId);
CREATE INDEX idx_ro_maro ON Lib_RO(MaRo);
CREATE INDEX idx_ro_vtid ON Lib_RO(VTId);
CREATE INDEX idx_npl_item ON Lib_NguyenPhuLieu(Item);

-- ==============================================================================
-- DỮ LIỆU MẪU PRODUCTION BGG (SEED DATA)
-- ==============================================================================

-- 1. Kho
INSERT INTO Lib_DanhSachKho (KId, MaKho, TenKho) VALUES
(1, 'KHO-NPL', 'Kho Nguyên Phụ Liệu BGG'),
(2, 'KHO-VAI', 'Kho Vải BGG'),
(3, 'TP', 'Kho Thành Phẩm'),
(4, 'BTPC', 'Kho Bán Thành Phẩm Cắt');

-- 2. Khách hàng / NCC
INSERT INTO Lib_KhachHang (KHId, MaKhachHang, TenDayDu, TenNgan) VALUES
(101, 'NCC-HN', 'Công Ty TNHH Phụ Liệu May Hà Nội', 'Phụ Liệu HN'),
(102, 'NCC-PP', 'Tổng Công Ty Dệt May Phong Phú', 'Phong Phú'),
(103, 'NCC-YKK', 'Công Ty Khóa Kéo YKK Việt Nam', 'YKK VN');

-- 3. Vị trí kệ kho
INSERT INTO Lib_ViTriKho (VTId, TenViTri, KId, MoTa) VALUES
(1001, 'LOC-A1-01', 1, 'Kệ A1 - Tầng 1 (Chỉ may & Mex)'),
(1002, 'LOC-A1-02', 1, 'Kệ A1 - Tầng 2 (Chỉ may & Mex)'),
(2001, 'LOC-B2-01', 1, 'Kệ B2 - Tầng 1 (Cúc áo & Phụ liệu nhựa)'),
(2002, 'LOC-B2-02', 1, 'Kệ B2 - Tầng 2 (Khóa kéo đồng)'),
(3001, 'LOC-C3-01', 1, 'Kệ C3 - Tầng 1 (Nhãn ép & Chun dệt)');

-- 4. Danh mục NPL (Vật tư phụ liệu)
INSERT INTO Lib_NguyenPhuLieu (VTId, Item, DienGiai, MaChungLoai, DVT, Size, MaMau, DHId) VALUES
(501, 'CHI-DEN-40', 'Chỉ may Polyester Đen 40/2', 'CHI', 'Cuộn', '40/2', 'DEN', 202601),
(502, 'KHOA-DONG-15CM', 'Khóa kéo đồng 15cm YKK', 'KHOA', 'Bịch (50 cái)', '15cm', 'DONG', 202601),
(503, 'NHAN-EP-SIZE-L', 'Nhãn ép nhiệt phản quang Size L', 'NHAN', 'Túi (100 cái)', 'L', 'TRANG', 202601),
(504, 'CUC-4LO-TRANG', 'Cúc áo 4 lỗ trắng xà cừ 11mm', 'CUC', 'Gói (144 cái)', '11mm', 'TRANG', 202602),
(505, 'CHI-TRANG-40', 'Chỉ may Spun Polyester Trắng 40/2', 'CHI', 'Cuộn', '40/2', 'TRANG', 202602),
(506, 'MEX-CO-AO', 'Mex keo dựng cổ áo sơ mi cao cấp', 'MEX', 'Cuộn (50m)', '50m', 'TRANG', 202602),
(507, 'BO-CO-POLO-DEN', 'Bo cổ dệt Jacquard Đen', 'BO_CO', 'Bó (20 cái)', 'Free', 'DEN', 202603),
(508, 'CHUN-LUNG-3CM', 'Chun dệt thoi co giãn 3cm', 'CHUN', 'Cuộn (40m)', '3cm', 'TRANG', 202603);

-- 5. Phiếu giám định master (Trạng thái DAXACNHAN chuẩn proc BGG)
INSERT INTO WH_PhieuGiamDinh (PGDId, MaPhieu, KHId, KId, MaHang, TrangThai, HangDangTrenXe, DanhSachPO) VALUES
(10001, 'PGD-JACKET-2026-01', 101, 1, 'AO-KHOAC-GIO-NAM-2026', 'DAXACNHAN', 0, 'PO-JACKET-01'),
(10002, 'PGD-SHIRT-2026-02', 102, 1, 'SO-MI-OXFORD-SLIMFIT', 'DAXACNHAN', 0, 'PO-SHIRT-02'),
(10003, 'PGD-POLO-2026-03', 103, 1, 'AO-POLO-SPORT-DRY', 'DAXACNHAN', 0, 'PO-POLO-03');

-- 6. Chi tiết phiếu giám định
INSERT INTO WH_ChiTietPhieuGiamDinh (CTPGDId, PGDId, VTId, SoPO, PONo, SLKiem, SLDat, SLKDat, Lot) VALUES
(20001, 10001, 501, 'PO-JACKET-01', 'PO-JK-01', 10.0, 2.0, 0, 'LOT-CHI-01'),
(20002, 10001, 502, 'PO-JACKET-01', 'PO-JK-01', 5.0, 1.0, 0, 'LOT-KHOA-01'),
(20003, 10001, 503, 'PO-JACKET-01', 'PO-JK-01', 4.0, 0.0, 0, 'LOT-NHAN-01'),
(20004, 10002, 504, 'PO-SHIRT-02', 'PO-SM-02', 8.0, 1.0, 0, 'LOT-CUC-01'),
(20005, 10002, 505, 'PO-SHIRT-02', 'PO-SM-02', 12.0, 0.0, 0, 'LOT-CHI-02'),
(20006, 10002, 506, 'PO-SHIRT-02', 'PO-SM-02', 3.0, 0.0, 0, 'LOT-MEX-01'),
(20007, 10003, 507, 'PO-POLO-03', 'PO-PL-03', 6.0, 0.0, 0, 'LOT-BO-01'),
(20008, 10003, 508, 'PO-POLO-03', 'PO-PL-03', 5.0, 0.0, 0, 'LOT-CHUN-01');

-- 7. Rọ mẫu đã có trong kho
INSERT INTO Lib_RO (MaRo, VTId, TenViTri, KId, TrangThaiRo, TongSoCay, NgayDongThung) VALUES
('TH-00098', 1001, 'LOC-A1-01', 1, 'STORED', 4, CURRENT_TIMESTAMP);

-- 8. Chi tiết các cây / gói phụ liệu trong rọ mẫu TH-00098
INSERT INTO WH_ChiTietPhieuGiamDinh_Cay (MaCay, CTPGDId, MaRo, SL, SoLuongXuat) VALUES
('ITEM-CHI-DEN-001', 20001, 'TH-00098', 1.0, 0.0),
('ITEM-CHI-DEN-002', 20001, 'TH-00098', 1.0, 0.0),
('ITEM-KHOA-DONG-001', 20002, 'TH-00098', 1.0, 0.0),
('ITEM-CUC-TRANG-001', 20004, 'TH-00098', 1.0, 0.0);
