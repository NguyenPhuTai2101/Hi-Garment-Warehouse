-- ==============================================================================
-- DATABASE SCHEMA: HỆ THỐNG QUẢN LÝ KHO PHỤ LIỆU MAY MẶC (WMS)
-- MODULE: KIỂM ĐỊNH & ĐỊNH DANH THÙNG HỖN HỢP (MIXED CARTON)
-- HỆ CSDL: PostgreSQL 18
-- DATABASE: Hi-Garment-warehouse
-- ==============================================================================

-- Bật extension uuid nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG VỊ TRÍ KHO (LOCATIONS)
CREATE TABLE IF NOT EXISTS locations (
    location_id VARCHAR(50) PRIMARY KEY,
    zone VARCHAR(50) NOT NULL,
    rack VARCHAR(50) NOT NULL,
    bin VARCHAR(50) DEFAULT 'Tầng 1',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE locations IS 'Bảng danh mục vị trí lưu kho kệ, tầng, ô (Rack / Bin)';

-- 2. BẢNG PHIẾU GIÁM ĐỊNH (INSPECTION ORDERS - THEO MÃ HÀNG)
CREATE TABLE IF NOT EXISTS inspection_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    style_code VARCHAR(100) NOT NULL,
    po_number VARCHAR(50),
    vendor_name VARCHAR(200) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE inspection_orders IS 'Phiếu giám định kiểm nhận theo từng mã hàng may mặc (1 Phiếu = 1 Mã hàng)';

-- 3. BẢNG CHI TIẾT PHIẾU GIÁM ĐỊNH (INSPECTION ORDER DETAILS)
CREATE TABLE IF NOT EXISTS inspection_order_details (
    detail_id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES inspection_orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    planned_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    received_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tolerance_percent NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_received_qty CHECK (received_qty >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_details_item ON inspection_order_details(item_code);
CREATE INDEX IF NOT EXISTS idx_order_details_order ON inspection_order_details(order_id);

COMMENT ON TABLE inspection_order_details IS 'Danh sách các mã phụ liệu cần kiểm nhận trong phiếu giám định';

-- 4. BẢNG THÙNG CHA (CARTONS - PARENT BARCODE / LPN)
CREATE TABLE IF NOT EXISTS cartons (
    carton_id VARCHAR(50) PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'STORED', 'EMPTY', 'SCRAPPED')),
    total_items_count INT DEFAULT 0,
    note TEXT,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    stored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cartons_status ON cartons(status);
CREATE INDEX IF NOT EXISTS idx_cartons_location ON cartons(location_id);

COMMENT ON TABLE cartons IS 'Bảng định danh vỏ thùng vật lý (Parent Carton ID / LPN)';

-- 5. BẢNG TEM PHỤ LIỆU CON (CARTON ITEMS - CHILD BARCODE)
CREATE TABLE IF NOT EXISTS carton_items (
    item_id BIGSERIAL PRIMARY KEY,
    child_barcode VARCHAR(100) UNIQUE NOT NULL,
    carton_id VARCHAR(50) REFERENCES cartons(carton_id) ON DELETE SET NULL ON UPDATE CASCADE,
    order_id VARCHAR(50) REFERENCES inspection_orders(order_id) ON UPDATE CASCADE,
    detail_id BIGINT REFERENCES inspection_order_details(detail_id) ON DELETE SET NULL,
    style_code VARCHAR(100) NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    qty NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit VARCHAR(50) NOT NULL,
    location_id VARCHAR(50) REFERENCES locations(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    quality_status VARCHAR(30) DEFAULT 'PASS' CHECK (quality_status IN ('PASS', 'FAIL', 'HOLD')),
    lot_number VARCHAR(100),
    scanned_by VARCHAR(100) DEFAULT 'PDA_USER',
    scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carton_items_barcode ON carton_items(child_barcode);
CREATE INDEX IF NOT EXISTS idx_carton_items_carton ON carton_items(carton_id);
CREATE INDEX IF NOT EXISTS idx_carton_items_location ON carton_items(location_id);
CREATE INDEX IF NOT EXISTS idx_carton_items_itemcode ON carton_items(item_code);

COMMENT ON TABLE carton_items IS 'Mã tem barcode phụ liệu duy nhất dán trên từng cuộn/bịch (Child Barcode)';

-- 6. BẢNG NHẬT KÝ QUÉT BARCODE (SCAN AUDIT LOGS)
CREATE TABLE IF NOT EXISTS scan_audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    barcode VARCHAR(100) NOT NULL,
    scan_action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message TEXT,
    device_info TEXT,
    scanned_by VARCHAR(100) DEFAULT 'PDA_USER',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON scan_audit_logs(created_at DESC);

-- ==============================================================================
-- NẠP DỮ LIỆU MẪU (SEED DATA)
-- ==============================================================================

-- 1. Nạp Locations
INSERT INTO locations (location_id, zone, rack, bin, description) VALUES
('LOC-A1-01', 'Khu A', 'Kệ A1', 'Tầng 1', 'Kệ phụ liệu Chỉ & Mex'),
('LOC-A1-02', 'Khu A', 'Kệ A1', 'Tầng 2', 'Kệ phụ liệu Chỉ & Mex'),
('LOC-B2-01', 'Khu B', 'Kệ B2', 'Tầng 1', 'Kệ Cúc & Phụ liệu nhựa'),
('LOC-B2-02', 'Khu B', 'Kệ B2', 'Tầng 2', 'Kệ Cúc & Khóa kéo'),
('LOC-C3-01', 'Khu C', 'Kệ C3', 'Tầng 1', 'Kệ Nhãn mác & Chun dệt')
ON CONFLICT (location_id) DO NOTHING;

-- 2. Nạp Phiếu Giám Định
INSERT INTO inspection_orders (order_id, style_code, po_number, vendor_name, status) VALUES
('QC-JACKET-01', 'AO-KHOAC-GIO-NAM-2026', 'PO-2026-001', 'Cty Phụ Liệu May Hà Nội', 'IN_PROGRESS'),
('QC-SHIRT-02', 'SO-MI-OXFORD-SLIMFIT', 'PO-2026-002', 'Dệt May Phong Phú', 'IN_PROGRESS'),
('QC-POLO-03', 'AO-POLO-SPORT-DRY', 'PO-2026-003', 'Cty Khóa Kéo YKK', 'PENDING')
ON CONFLICT (order_id) DO NOTHING;

-- 3. Nạp Chi Tiết Phiếu Giám Định
INSERT INTO inspection_order_details (order_id, item_code, item_name, unit, planned_qty, received_qty) VALUES
('QC-JACKET-01', 'CHI-DEN-40', 'Chỉ may Polyester Đen 40/2', 'Cuộn', 10.00, 2.00),
('QC-JACKET-01', 'KHOA-DONG-15CM', 'Khóa kéo đồng 15cm YKK', 'Bịch (50 cái)', 5.00, 1.00),
('QC-JACKET-01', 'NHAN-EP-SIZE-L', 'Nhãn ép nhiệt phản quang Size L', 'Túi (100 cái)', 4.00, 0.00),
('QC-SHIRT-02', 'CUC-4LO-TRANG', 'Cúc áo 4 lỗ trắng xà cừ 11mm', 'Gói (144 cái)', 8.00, 1.00),
('QC-SHIRT-02', 'CHI-TRANG-40', 'Chỉ may Spun Polyester Trắng 40/2', 'Cuộn', 12.00, 0.00),
('QC-SHIRT-02', 'MEX-CO-AO', 'Mex keo dựng cổ áo sơ mi cao cấp', 'Cuộn (50m)', 3.00, 0.00),
('QC-POLO-03', 'BO-CO-POLO-DEN', 'Bo cổ dệt Jacquard Đen', 'Bó (20 cái)', 6.00, 0.00),
('QC-POLO-03', 'CHUN-LUNG-3CM', 'Chun dệt thoi co giãn 3cm', 'Cuộn (40m)', 5.00, 0.00)
ON CONFLICT DO NOTHING;

-- 4. Nạp Thùng Mẫu Đã Lên Kệ (TH-00098)
INSERT INTO cartons (carton_id, location_id, status, total_items_count, closed_at, stored_at) VALUES
('TH-00098', 'LOC-A1-01', 'STORED', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (carton_id) DO NOTHING;

-- 5. Nạp Phụ Liệu Trong Thùng TH-00098
INSERT INTO carton_items (child_barcode, carton_id, order_id, style_code, item_code, item_name, qty, unit, location_id, quality_status) VALUES
('ITEM-CHI-DEN-001', 'TH-00098', 'QC-JACKET-01', 'AO-KHOAC-GIO-NAM-2026', 'CHI-DEN-40', 'Chỉ may Polyester Đen 40/2', 1.00, 'Cuộn', 'LOC-A1-01', 'PASS'),
('ITEM-CHI-DEN-002', 'TH-00098', 'QC-JACKET-01', 'AO-KHOAC-GIO-NAM-2026', 'CHI-DEN-40', 'Chỉ may Polyester Đen 40/2', 1.00, 'Cuộn', 'LOC-A1-01', 'PASS'),
('ITEM-KHOA-DONG-001', 'TH-00098', 'QC-JACKET-01', 'AO-KHOAC-GIO-NAM-2026', 'KHOA-DONG-15CM', 'Khóa kéo đồng 15cm YKK', 1.00, 'Bịch (50 cái)', 'LOC-A1-01', 'PASS'),
('ITEM-CUC-TRANG-001', 'TH-00098', 'QC-SHIRT-02', 'SO-MI-OXFORD-SLIMFIT', 'CUC-4LO-TRANG', 'Cúc áo 4 lỗ trắng xà cừ 11mm', 1.00, 'Gói (144 cái)', 'LOC-A1-01', 'PASS')
ON CONFLICT (child_barcode) DO NOTHING;
