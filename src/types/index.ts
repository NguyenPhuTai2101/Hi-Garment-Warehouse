export type InspectionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
export type CartonStatus = 'OPEN' | 'CLOSED' | 'STORED' | 'EMPTY'
export type QualityStatus = 'PASS' | 'FAIL' | 'HOLD'

export interface InspectionOrderDetail {
  id: string
  orderId: string
  itemCode: string
  itemName: string
  unit: string
  plannedQty: number
  receivedQty: number
}

export interface InspectionOrder {
  orderId: string
  styleCode: string
  vendor: string
  createdDate: string
  status: InspectionStatus
  items: InspectionOrderDetail[]
}

export interface CartonItem {
  id?: number
  childBarcode: string
  cartonId: string
  orderId: string
  styleCode: string
  itemCode: string
  itemName: string
  qty: number
  unit: string
  qualityStatus: QualityStatus
  locationId?: string
  scannedAt: string
}

export interface Carton {
  cartonId: string
  status: CartonStatus
  locationId?: string
  createdAt: string
  closedAt?: string
  totalItemsCount: number
}

export interface WarehouseLocation {
  locationId: string
  zone: string
  rack: string
  bin: string
  description: string
}

export interface ScanResultFeedback {
  type: 'SUCCESS' | 'ERROR' | 'WARNING'
  title: string
  message: string
  barcode: string
  timestamp: number
}
