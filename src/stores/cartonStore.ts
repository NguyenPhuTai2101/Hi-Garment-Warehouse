import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../database/db'
import type { Carton, CartonItem, ScanResultFeedback } from '../types'
import { useSoundAndHaptic } from '../composables/useSoundAndHaptic'

const cloneRaw = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

export const useCartonStore = defineStore('carton', () => {
  const activeCarton = ref<Carton | null>(null)
  const activeCartonItems = ref<CartonItem[]>([])
  const lastFeedback = ref<ScanResultFeedback | null>(null)
  const isProcessing = ref(false)

  const { playSuccess, playError, playWarning } = useSoundAndHaptic()

  const setFeedback = (type: 'SUCCESS' | 'ERROR' | 'WARNING', title: string, message: string, barcode: string) => {
    lastFeedback.value = {
      type,
      title,
      message,
      barcode,
      timestamp: Date.now()
    }
  }

  const clearFeedback = () => {
    lastFeedback.value = null
  }

  // Load existing open carton
  const loadActiveCarton = async (cartonId: string) => {
    const existing = await db.cartons.get(cartonId)
    if (existing) {
      activeCarton.value = existing
      activeCartonItems.value = await db.cartonItems.where('cartonId').equals(cartonId).toArray()
    }
  }

  // Activate or create a new carton (Sync with PostgreSQL API + local Dexie)
  const activateCarton = async (cartonIdInput: string): Promise<boolean> => {
    const cleanId = cartonIdInput.trim().toUpperCase()
    if (!cleanId) return false

    try {
      // 1. Try PostgreSQL API first if online
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/cartons/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartonId: cleanId })
          })
          const result = await res.json()
          if (result.success && result.data) {
            const data = result.data
            activeCarton.value = {
              cartonId: data.cartonId,
              locationId: data.locationId,
              status: data.status,
              totalItemsCount: data.totalItemsCount || 0,
              createdAt: data.createdAt
            }
            activeCartonItems.value = (data.items || []).map((i: any) => ({
              id: i.id,
              childBarcode: i.childBarcode,
              cartonId: i.cartonId,
              orderId: i.orderId,
              styleCode: i.styleCode,
              itemCode: i.itemCode,
              itemName: i.itemName,
              qty: i.qty,
              unit: i.unit,
              qualityStatus: i.qualityStatus,
              locationId: i.locationId,
              scannedAt: i.scannedAt
            }))

            // Sync to local Dexie with safe clone
            await db.cartons.put(cloneRaw(activeCarton.value))
            playSuccess()
            setFeedback('SUCCESS', 'Mở thùng thành công', `Đã kết nối PostgreSQL: Thùng ${cleanId} (${activeCarton.value.totalItemsCount} món)`, cleanId)
            return true
          }
        } catch (apiErr) {
          console.warn('API call failed, falling back to local database:', apiErr)
        }
      }

      // 2. Fallback to local Dexie database
      let carton = await db.cartons.get(cleanId)
      if (carton) {
        if (carton.status === 'STORED') {
          playWarning()
          setFeedback('WARNING', 'Thùng đã lên kệ', `Thùng ${cleanId} đã được cất tại kệ ${carton.locationId}.`, cleanId)
        } else {
          playSuccess()
          setFeedback('SUCCESS', 'Mở lại thùng (Offline)', `Thùng ${cleanId} (${carton.totalItemsCount} phụ liệu)`, cleanId)
        }
      } else {
        carton = {
          cartonId: cleanId,
          status: 'OPEN',
          createdAt: new Date().toLocaleString('vi-VN'),
          totalItemsCount: 0
        }
        await db.cartons.put(cloneRaw(carton))
        playSuccess()
        setFeedback('SUCCESS', 'Tạo thùng mới (Offline)', `Đã kích hoạt thùng mới ${cleanId}`, cleanId)
      }

      activeCarton.value = carton
      activeCartonItems.value = await db.cartonItems.where('cartonId').equals(cleanId).toArray()
      return true
    } catch (err: any) {
      playError()
      setFeedback('ERROR', 'Lỗi kích hoạt', err.message || 'Không thể mở thùng', cleanId)
      return false
    }
  }

  // Scan child accessory barcode into active carton
  const scanChildItem = async (barcodeInput: string): Promise<boolean> => {
    if (!activeCarton.value) {
      playError()
      setFeedback('ERROR', 'Chưa có thùng active', 'Vui lòng quét hoặc tạo mã Thùng (Carton ID) trước!', barcodeInput)
      return false
    }

    if (activeCarton.value.status === 'CLOSED') {
      playError()
      setFeedback('ERROR', 'Thùng đã đóng!', `Thùng ${activeCarton.value.cartonId} đã hoàn tất kiểm đếm. Vui lòng mở thùng mới!`, barcodeInput)
      return false
    }

    const cleanBarcode = barcodeInput.trim().toUpperCase()
    if (!cleanBarcode) return false

    isProcessing.value = true

    try {
      // 1. Try PostgreSQL API with ACID transaction
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/cartons/scan-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartonId: activeCarton.value.cartonId,
              barcode: cleanBarcode
            })
          })
          const result = await res.json()

          if (!result.success) {
            playError()
            setFeedback('ERROR', 'Không thể nhận mã này', result.message, cleanBarcode)
            return false
          }

          const { item, orderProgress } = result.data
          const newItem: CartonItem = {
            id: item.id,
            childBarcode: item.childBarcode,
            cartonId: item.cartonId,
            orderId: item.orderId,
            styleCode: item.styleCode,
            itemCode: item.itemCode,
            itemName: item.itemName,
            qty: item.qty,
            unit: item.unit,
            qualityStatus: item.qualityStatus,
            scannedAt: item.scannedAt
          }

          // Update local state and Dexie cache safely
          activeCartonItems.value.unshift(newItem)
          activeCarton.value.totalItemsCount += 1
          await db.cartonItems.put(cloneRaw(newItem))
          await db.cartons.put(cloneRaw(activeCarton.value))

          playSuccess()
          setFeedback(
            'SUCCESS',
            `+1 ${item.itemName}`,
            `PostgreSQL: Đơn ${orderProgress.styleCode} | Tiến độ: ${orderProgress.receivedQty}/${orderProgress.plannedQty} ${orderProgress.unit}`,
            cleanBarcode
          )
          return true
        } catch (apiErr) {
          console.warn('API error, fallback to offline Dexie logic:', apiErr)
        }
      }

      // 2. Offline fallback logic
      const existingItem = await db.cartonItems.where('childBarcode').equals(cleanBarcode).first()
      if (existingItem) {
        playError()
        setFeedback('ERROR', 'Trùng tem phụ liệu!', `Tem ${cleanBarcode} đã được quét trước đó vào thùng ${existingItem.cartonId}!`, cleanBarcode)
        return false
      }

      const allOrders = await db.inspectionOrders.where('status').notEqual('COMPLETED').toArray()
      let matchedOrder: any = null
      let matchedDetail: any = null

      const cleanKey = cleanBarcode.replace(/^(ITEM|ACC)-/i, '').replace(/-\d+$/, '').trim()
      const tokens = cleanKey.split(/[-_\s]+/).filter(t => t.length > 1)

      for (const order of allOrders) {
        for (const it of order.items) {
          const code = it.itemCode.toUpperCase()
          const name = it.itemName.toUpperCase()
          const matchTokens = tokens.filter(t => code.includes(t) || name.includes(t))
          if (matchTokens.length >= Math.min(2, tokens.length) || code.includes(cleanKey)) {
            matchedOrder = order
            matchedDetail = it
            break
          }
        }
        if (matchedDetail) break
      }

      if (!matchedDetail) {
        playError()
        setFeedback('ERROR', 'Không tìm thấy Phiếu Giám Định', `Không có phiếu nào đang chờ mã: ${cleanBarcode}`, cleanBarcode)
        return false
      }

      const newItem: CartonItem = {
        childBarcode: cleanBarcode,
        cartonId: activeCarton.value.cartonId,
        orderId: matchedOrder.orderId,
        styleCode: matchedOrder.styleCode,
        itemCode: matchedDetail.itemCode,
        itemName: matchedDetail.itemName,
        qty: 1,
        unit: matchedDetail.unit,
        qualityStatus: 'PASS',
        scannedAt: new Date().toLocaleString('vi-VN')
      }

      await db.cartonItems.add(cloneRaw(newItem))
      matchedDetail.receivedQty += 1
      await db.inspectionOrders.put(cloneRaw(matchedOrder))

      activeCarton.value.totalItemsCount += 1
      await db.cartons.put(cloneRaw(activeCarton.value))
      activeCartonItems.value.unshift(newItem)

      playSuccess()
      setFeedback('SUCCESS', `+1 ${matchedDetail.itemName} (Offline)`, `Đơn: ${matchedOrder.styleCode}`, cleanBarcode)
      return true
    } catch (err: any) {
      playError()
      setFeedback('ERROR', 'Lỗi xử lý quét', err.message, cleanBarcode)
      return false
    } finally {
      isProcessing.value = false
    }
  }

  // Close active carton
  const closeCarton = async () => {
    if (!activeCarton.value) return
    const cid = activeCarton.value.cartonId
    activeCarton.value.status = 'CLOSED'
    activeCarton.value.closedAt = new Date().toLocaleString('vi-VN')

    if (navigator.onLine) {
      try {
        await fetch('/api/cartons/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartonId: cid })
        })
      } catch (e) {
        console.warn('API close error:', e)
      }
    }

    try {
      await db.cartons.put(cloneRaw(activeCarton.value))
    } catch (e) {
      console.warn('Dexie close save error:', e)
    }

    playSuccess()
    setFeedback(
      'SUCCESS',
      'Đã đóng thùng thành công!',
      `Thùng ${cid} đã đóng hoàn tất (${activeCarton.value.totalItemsCount} phụ liệu). Sẵn sàng cất lên kệ!`,
      cid
    )
  }

  const clearActiveCarton = () => {
    activeCarton.value = null
    activeCartonItems.value = []
    playSuccess()
    setFeedback('SUCCESS', 'Đã đổi thùng', 'Màn hình đã sẵn sàng để quét thùng carton mới.', '')
  }

  return {
    activeCarton,
    activeCartonItems,
    lastFeedback,
    isProcessing,
    activateCarton,
    loadActiveCarton,
    scanChildItem,
    closeCarton,
    clearActiveCarton,
    setFeedback,
    clearFeedback
  }
})
