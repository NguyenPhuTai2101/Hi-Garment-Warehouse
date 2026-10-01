import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../database/db'
import type { WarehouseLocation, ScanResultFeedback } from '../types'
import { useSoundAndHaptic } from '../composables/useSoundAndHaptic'

export const usePutawayStore = defineStore('putaway', () => {
  const activeLocation = ref<WarehouseLocation | null>(null)
  const putawayMode = ref<'CARTON' | 'ITEM'>('CARTON')
  const lastFeedback = ref<ScanResultFeedback | null>(null)
  const recentPutaways = ref<Array<{ code: string; location: string; type: string; time: string }>>([])

  const { playSuccess, playError } = useSoundAndHaptic()

  const setFeedback = (type: 'SUCCESS' | 'ERROR' | 'WARNING', title: string, message: string, barcode: string) => {
    lastFeedback.value = {
      type,
      title,
      message,
      barcode,
      timestamp: Date.now()
    }
  }

  const setLocation = async (locationIdInput: string): Promise<boolean> => {
    const cleanId = locationIdInput.trim().toUpperCase()
    if (!cleanId) return false

    const loc = await db.locations.get(cleanId)
    if (loc) {
      activeLocation.value = loc
      playSuccess()
      setFeedback('SUCCESS', 'Đã chọn vị trí kệ', `${loc.locationId} (${loc.zone} - ${loc.rack})`, cleanId)
      return true
    } else {
      const newLoc: WarehouseLocation = {
        locationId: cleanId,
        zone: 'Khu Chờ',
        rack: cleanId,
        bin: 'Tầng 1',
        description: 'Vị trí kệ tạo nhanh'
      }
      await db.locations.put(newLoc)
      activeLocation.value = newLoc
      playSuccess()
      setFeedback('SUCCESS', 'Tạo mới vị trí kệ', `Đã nhận diện vị trí ${cleanId}`, cleanId)
      return true
    }
  }

  // Put entire carton into active location (PostgreSQL API sync)
  const putawayCarton = async (cartonIdInput: string): Promise<boolean> => {
    if (!activeLocation.value) {
      playError()
      setFeedback('ERROR', 'Chưa quét vị trí kệ', 'Vui lòng quét Mã Vị Trí Kệ (Location ID) trước!', cartonIdInput)
      return false
    }

    const cleanCartonId = cartonIdInput.trim().toUpperCase()
    const locId = activeLocation.value.locationId

    try {
      // 1. Try PostgreSQL API first
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/putaway/carton', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartonId: cleanCartonId, locationId: locId })
          })
          const result = await res.json()
          if (!result.success) {
            playError()
            setFeedback('ERROR', 'Lỗi cất thùng', result.message, cleanCartonId)
            return false
          }

          playSuccess()
          setFeedback('SUCCESS', 'Cất thùng thành công (PostgreSQL)', result.message, cleanCartonId)
          recentPutaways.value.unshift({
            code: cleanCartonId,
            location: locId,
            type: 'Thùng nguyên',
            time: new Date().toLocaleTimeString('vi-VN')
          })

          // Update local cache
          const carton = await db.cartons.get(cleanCartonId)
          if (carton) {
            carton.locationId = locId
            carton.status = 'STORED'
            await db.cartons.put(carton)
          }
          return true
        } catch (apiErr) {
          console.warn('Putaway API failed, using local offline logic:', apiErr)
        }
      }

      // 2. Offline fallback
      const carton = await db.cartons.get(cleanCartonId)
      if (!carton) {
        playError()
        setFeedback('ERROR', 'Không tìm thấy thùng', `Thùng ${cleanCartonId} chưa có trên hệ thống!`, cleanCartonId)
        return false
      }

      carton.locationId = locId
      carton.status = 'STORED'
      await db.cartons.put(carton)

      const items = await db.cartonItems.where('cartonId').equals(cleanCartonId).toArray()
      for (const item of items) {
        item.locationId = locId
        if (item.id) await db.cartonItems.put(item)
      }

      playSuccess()
      setFeedback('SUCCESS', 'Cất thùng thành công (Offline)', `Thùng ${cleanCartonId} đã lưu tại ${locId}`, cleanCartonId)
      recentPutaways.value.unshift({
        code: cleanCartonId,
        location: locId,
        type: 'Thùng nguyên',
        time: new Date().toLocaleTimeString('vi-VN')
      })
      return true
    } catch (err: any) {
      playError()
      setFeedback('ERROR', 'Lỗi cất thùng', err.message, cleanCartonId)
      return false
    }
  }

  // Putaway individual item (Pick to bin / loose accessory)
  const putawaySingleItem = async (childBarcodeInput: string): Promise<boolean> => {
    if (!activeLocation.value) {
      playError()
      setFeedback('ERROR', 'Chưa quét vị trí kệ', 'Vui lòng quét Mã Vị Trí Kệ trước!', childBarcodeInput)
      return false
    }

    const cleanBarcode = childBarcodeInput.trim().toUpperCase()
    const locId = activeLocation.value.locationId

    try {
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/putaway/item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childBarcode: cleanBarcode, locationId: locId })
          })
          const result = await res.json()
          if (!result.success) {
            playError()
            setFeedback('ERROR', 'Lỗi cất lẻ', result.message, cleanBarcode)
            return false
          }

          playSuccess()
          setFeedback('SUCCESS', 'Đã cất lẻ phụ liệu (PostgreSQL)', result.message, cleanBarcode)
          recentPutaways.value.unshift({
            code: cleanBarcode,
            location: locId,
            type: 'Xé lẻ',
            time: new Date().toLocaleTimeString('vi-VN')
          })
          return true
        } catch (apiErr) {
          console.warn('API error, using offline putaway:', apiErr)
        }
      }

      // Offline
      const item = await db.cartonItems.where('childBarcode').equals(cleanBarcode).first()
      if (!item) {
        playError()
        setFeedback('ERROR', 'Không tìm thấy tem', `Tem phụ liệu ${cleanBarcode} chưa được quét kiểm định!`, cleanBarcode)
        return false
      }

      item.locationId = locId
      if (item.id) await db.cartonItems.put(item)

      playSuccess()
      setFeedback('SUCCESS', 'Đã cất lẻ phụ liệu (Offline)', `${cleanBarcode} -> ${locId}`, cleanBarcode)
      recentPutaways.value.unshift({
        code: cleanBarcode,
        location: locId,
        type: 'Xé lẻ',
        time: new Date().toLocaleTimeString('vi-VN')
      })
      return true
    } catch (err: any) {
      playError()
      setFeedback('ERROR', 'Lỗi cất lẻ', err.message, cleanBarcode)
      return false
    }
  }

  const clearLocation = () => {
    activeLocation.value = null
  }

  return {
    activeLocation,
    putawayMode,
    lastFeedback,
    recentPutaways,
    setLocation,
    putawayCarton,
    putawaySingleItem,
    clearLocation
  }
})
