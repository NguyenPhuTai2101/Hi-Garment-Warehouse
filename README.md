# ScanCarton PWA & Backend WMS - Quản Lý Kho Phụ Liệu Mixed Carton

Hệ thống quản lý kho may mặc (WMS) chuyên dụng cho máy kiểm kho PDA và thiết bị di động, giải quyết bài toán **Kiểm định phụ liệu & Định danh thùng hỗn hợp (Mixed Carton)** theo mô hình **Parent - Child (Carton ID $\leftrightarrow$ Child Item Barcode)**.

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

```
[Máy PDA / Trình Duyệt Mobile PWA]
          │
          │ HTTP / REST API (Proxy qua Vite /api)
          ▼
   [Express API Server (Port 3001)]
          │
          │ ACID Transactions (pg pool)
          ▼
   [PostgreSQL 18: Hi-Garment-warehouse]
   ├── locations (Vị trí kệ Rack/Bin)
   ├── inspection_orders (Phiếu giám định theo mã hàng)
   ├── inspection_order_details (Chi tiết phụ liệu kế hoạch & thực nhận)
   ├── cartons (Vỏ thùng cha - Parent Carton ID / LPN)
   ├── carton_items (Tem phụ liệu con - Child Barcode)
   └── scan_audit_logs (Lịch sử quét barcode từ PDA)
```

* **Khả năng Offline-First:** Khi có mạng, PWA ghi thẳng vào PostgreSQL qua REST API. Khi mất sóng Wi-Fi trong kho, PWA tự động lưu vào **IndexedDB (Dexie.js)** và tiếp tục hoạt động không gián đoạn.

---

## 🚀 Danh Sách API Backend (Port 3001)

| Phương thức | Đường dẫn API | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra kết nối database PostgreSQL |
| `GET` | `/api/orders` | Danh sách phiếu giám định kèm chi tiết phụ liệu và % tiến độ |
| `GET` | `/api/orders/:id` | Chi tiết 1 phiếu giám định cụ thể |
| `POST` | `/api/cartons/activate` | Kích hoạt hoặc tạo mới thùng cha (`cartonId`) |
| `POST` | `/api/cartons/scan-item` | Quét nhận tem phụ liệu con: kiểm tra trùng, tự map vào phiếu giám định bằng **Transaction PostgreSQL** |
| `POST` | `/api/cartons/close` | Đóng thùng carton khi hoàn tất |
| `GET` | `/api/cartons/:id` | Tra cứu chi tiết thùng và các món phụ liệu bên trong |
| `GET` | `/api/putaway/locations`| Danh sách vị trí kệ kho |
| `POST` | `/api/putaway/carton` | Cất nguyên thùng (Thừa kế vị trí cho toàn bộ item con) |
| `POST` | `/api/putaway/item` | Cất lẻ 1 phụ liệu (Pick to Bin) |
| `GET` | `/api/lookup/:code` | Tra cứu thông minh: tự nhận diện mã thùng hoặc mã tem phụ liệu |

---

## 🛠️ Hướng Dẫn Khởi Chạy

### 1. File cấu hình môi trường (`.env`)
```env
PORT=3001
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=Hi-Garment-warehouse
PG_USER=postgres
PG_PASSWORD=12345678x@X
```

### 2. Chạy Backend API (Port 3001)
```bash
npm run server
```

### 3. Chạy Frontend PWA (Port 5173)
```bash
npm run dev
```

* Truy cập từ máy tính: `http://localhost:5173`
* Truy cập từ máy PDA / điện thoại cùng mạng Wi-Fi: `http://192.168.2.175:5173`
