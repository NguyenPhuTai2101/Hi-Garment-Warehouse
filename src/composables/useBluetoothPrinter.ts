import { ref } from 'vue'

export function useBluetoothPrinter() {
  const isConnected = ref(false)
  const connectedDeviceName = ref<string | null>(null)
  const isPrinting = ref(false)
  let characteristic: any = null

  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  const connect = async () => {
    if (!isBluetoothSupported) {
      alert('Trình duyệt hiện tại không hỗ trợ Web Bluetooth API. Cần dùng Chrome trên Android.')
      return false
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['generic_access', '000018f0-0000-1000-8000-00805f9b34fb']
      })

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
      const characteristics = await service.getCharacteristics()
      characteristic = characteristics[0]

      connectedDeviceName.value = device.name || 'Bluetooth Printer'
      isConnected.value = true
      return true
    } catch (err: any) {
      console.warn('Bluetooth connect error:', err)
      return false
    }
  }

  // Generate TSPL label string
  const generateTsplLabel = (barcode: string, title: string, sub: string, qty: string) => {
    return `
SIZE 50 mm, 30 mm
GAP 3 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,20,"3",0,1,1,"${title.substring(0, 22)}"
TEXT 20,50,"2",0,1,1,"${sub.substring(0, 28)}"
BARCODE 20,80,"128",60,1,0,2,4,"${barcode}"
TEXT 20,170,"2",0,1,1,"SL: ${qty}"
PRINT 1,1
`
  }

  const printLabel = async (barcode: string, title: string, sub: string, qty: string) => {
    isPrinting.value = true
    try {
      const tspl = generateTsplLabel(barcode, title, sub, qty)

      if (isConnected.value && characteristic) {
        const encoder = new TextEncoder()
        const data = encoder.encode(tspl)
        await characteristic.writeValue(data)
      } else {
        // Simulated print log for testing/demo
        console.log('[MÁY IN DEMO NHẬN LỆNH IN]:\n', tspl)
      }
      return true
    } catch (e) {
      console.error('Print failed:', e)
      return false
    } finally {
      isPrinting.value = false
    }
  }

  return {
    isBluetoothSupported,
    isConnected,
    connectedDeviceName,
    isPrinting,
    connect,
    printLabel
  }
}
