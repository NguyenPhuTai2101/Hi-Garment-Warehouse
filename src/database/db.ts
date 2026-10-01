import Dexie, { type Table } from 'dexie'
import type { Carton, CartonItem, InspectionOrder, WarehouseLocation } from '../types'

export class ScanCartonDatabase extends Dexie {
  cartons!: Table<Carton, string>
  cartonItems!: Table<CartonItem, number>
  inspectionOrders!: Table<InspectionOrder, string>
  locations!: Table<WarehouseLocation, string>

  constructor() {
    super('ScanCartonWMS_DB')
    this.version(1).stores({
      cartons: 'cartonId, status, locationId, createdAt',
      cartonItems: '++id, childBarcode, cartonId, orderId, styleCode, itemCode, locationId',
      inspectionOrders: 'orderId, styleCode, vendor, status',
      locations: 'locationId, zone, rack'
    })
  }
}

export const db = new ScanCartonDatabase()

// Seed initial sample data if database is empty
export async function initSampleData() {
  const orderCount = await db.inspectionOrders.count()
  if (orderCount === 0) {
    const sampleOrders: InspectionOrder[] = [
      {
        orderId: 'QC-JACKET-01',
        styleCode: 'AO-KHOAC-GIO-NAM-2026',
        vendor: 'Cty Phụ Liệu May Hà Nội',
        createdDate: '2026-10-01',
        status: 'IN_PROGRESS',
        items: [
          {
            id: 'QD-01',
            orderId: 'QC-JACKET-01',
            itemCode: 'CHI-DEN-40',
            itemName: 'Chỉ may Polyester Đen 40/2',
            unit: 'Cuộn',
            plannedQty: 10,
            receivedQty: 0
          },
          {
            id: 'QD-02',
            orderId: 'QC-JACKET-01',
            itemCode: 'KHOA-DONG-15CM',
            itemName: 'Khóa kéo đồng 15cm YKK',
            unit: 'Bịch (50 cái)',
            plannedQty: 5,
            receivedQty: 0
          },
          {
            id: 'QD-03',
            orderId: 'QC-JACKET-01',
            itemCode: 'NHAN-EP-SIZE-L',
            itemName: 'Nhãn ép nhiệt phản quang Size L',
            unit: 'Túi (100 cái)',
            plannedQty: 4,
            receivedQty: 0
          }
        ]
      },
      {
        orderId: 'QC-SHIRT-02',
        styleCode: 'SO-MI-OXFORD-SLIMFIT',
        vendor: 'Dệt May Phong Phú',
        createdDate: '2026-10-01',
        status: 'PENDING',
        items: [
          {
            id: 'QD-04',
            orderId: 'QC-SHIRT-02',
            itemCode: 'CUC-4LO-TRANG',
            itemName: 'Cúc áo 4 lỗ trắng xà cừ 11mm',
            unit: 'Gói (144 cái)',
            plannedQty: 8,
            receivedQty: 0
          },
          {
            id: 'QD-05',
            orderId: 'QC-SHIRT-02',
            itemCode: 'CHI-TRANG-40',
            itemName: 'Chỉ may Spun Polyester Trắng 40/2',
            unit: 'Cuộn',
            plannedQty: 12,
            receivedQty: 0
          },
          {
            id: 'QD-06',
            orderId: 'QC-SHIRT-02',
            itemCode: 'MEX-CO-AO',
            itemName: 'Mex keo dựng cổ áo sơ mi cao cấp',
            unit: 'Cuộn (50m)',
            plannedQty: 3,
            receivedQty: 0
          }
        ]
      },
      {
        orderId: 'QC-POLO-03',
        styleCode: 'AO-POLO-SPORT-DRY',
        vendor: 'Cty Khóa Kéo YKK',
        createdDate: '2026-10-01',
        status: 'PENDING',
        items: [
          {
            id: 'QD-07',
            orderId: 'QC-POLO-03',
            itemCode: 'BO-CO-POLO-DEN',
            itemName: 'Bo cổ dệt Jacquard Đen',
            unit: 'Bó (20 cái)',
            plannedQty: 6,
            receivedQty: 0
          },
          {
            id: 'QD-08',
            orderId: 'QC-POLO-03',
            itemCode: 'CHUN-LUNG-3CM',
            itemName: 'Chun dệt thoi co giãn 3cm',
            unit: 'Cuộn (40m)',
            plannedQty: 5,
            receivedQty: 0
          }
        ]
      }
    ]

    const sampleLocations: WarehouseLocation[] = [
      { locationId: 'LOC-A1-01', zone: 'Khu A', rack: 'Kệ A1', bin: 'Tầng 1', description: 'Kệ phụ liệu Chỉ & Mex' },
      { locationId: 'LOC-A1-02', zone: 'Khu A', rack: 'Kệ A1', bin: 'Tầng 2', description: 'Kệ phụ liệu Chỉ & Mex' },
      { locationId: 'LOC-B2-01', zone: 'Khu B', rack: 'Kệ B2', bin: 'Tầng 1', description: 'Kệ Cúc & Phụ liệu nhựa' },
      { locationId: 'LOC-B2-02', zone: 'Khu B', rack: 'Kệ B2', bin: 'Tầng 2', description: 'Kệ Cúc & Khóa kéo' },
      { locationId: 'LOC-C3-01', zone: 'Khu C', rack: 'Kệ C3', bin: 'Tầng 1', description: 'Kệ Nhãn mác & Chun dệt' }
    ]

    const sampleCartons: Carton[] = [
      {
        cartonId: 'TH-00098',
        status: 'STORED',
        locationId: 'LOC-A1-01',
        createdAt: '2026-09-30 08:30:00',
        closedAt: '2026-09-30 09:15:00',
        totalItemsCount: 4
      }
    ]

    const sampleCartonItems: CartonItem[] = [
      {
        childBarcode: 'ITEM-CHI-DEN-001',
        cartonId: 'TH-00098',
        orderId: 'QC-JACKET-01',
        styleCode: 'AO-KHOAC-GIO-NAM-2026',
        itemCode: 'CHI-DEN-40',
        itemName: 'Chỉ may Polyester Đen 40/2',
        qty: 1,
        unit: 'Cuộn',
        qualityStatus: 'PASS',
        scannedAt: '2026-09-30 08:45:00'
      },
      {
        childBarcode: 'ITEM-CHI-DEN-002',
        cartonId: 'TH-00098',
        orderId: 'QC-JACKET-01',
        styleCode: 'AO-KHOAC-GIO-NAM-2026',
        itemCode: 'CHI-DEN-40',
        itemName: 'Chỉ may Polyester Đen 40/2',
        qty: 1,
        unit: 'Cuộn',
        qualityStatus: 'PASS',
        scannedAt: '2026-09-30 08:46:00'
      },
      {
        childBarcode: 'ITEM-KHOA-DONG-001',
        cartonId: 'TH-00098',
        orderId: 'QC-JACKET-01',
        styleCode: 'AO-KHOAC-GIO-NAM-2026',
        itemCode: 'KHOA-DONG-15CM',
        itemName: 'Khóa kéo đồng 15cm YKK',
        qty: 1,
        unit: 'Bịch (50 cái)',
        qualityStatus: 'PASS',
        scannedAt: '2026-09-30 08:48:00'
      },
      {
        childBarcode: 'ITEM-CUC-TRANG-001',
        cartonId: 'TH-00098',
        orderId: 'QC-SHIRT-02',
        styleCode: 'SO-MI-OXFORD-SLIMFIT',
        itemCode: 'CUC-4LO-TRANG',
        itemName: 'Cúc áo 4 lỗ trắng xà cừ 11mm',
        qty: 1,
        unit: 'Gói (144 cái)',
        qualityStatus: 'PASS',
        scannedAt: '2026-09-30 08:50:00'
      }
    ]

    await db.inspectionOrders.bulkAdd(sampleOrders)
    await db.locations.bulkAdd(sampleLocations)
    await db.cartons.bulkAdd(sampleCartons)
    await db.cartonItems.bulkAdd(sampleCartonItems)

    // Update received qty for QC-JACKET-01 & QC-SHIRT-02 according to sample items
    const jacket = await db.inspectionOrders.get('QC-JACKET-01')
    if (jacket) {
      jacket.items[0].receivedQty = 2
      jacket.items[1].receivedQty = 1
      await db.inspectionOrders.put(jacket)
    }

    const shirt = await db.inspectionOrders.get('QC-SHIRT-02')
    if (shirt) {
      shirt.items[0].receivedQty = 1
      shirt.status = 'IN_PROGRESS'
      await db.inspectionOrders.put(shirt)
    }
  }
}
