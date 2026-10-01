import { onMounted, onUnmounted, ref } from 'vue'

interface UseBarcodeScannerOptions {
  minChars?: number
  maxCharIntervalMs?: number
  onScan: (barcode: string) => void
  disabled?: () => boolean
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const minChars = options.minChars ?? 3
  const maxCharIntervalMs = options.maxCharIntervalMs ?? 50
  const isEnabled = ref(true)

  let buffer = ''
  let lastKeyTime = 0

  const handleKeyDown = (e: KeyboardEvent) => {
    if (options.disabled && options.disabled()) {
      return
    }

    // Ignore modifier keys
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
      return
    }

    const now = Date.now()
    const timeDiff = now - lastKeyTime

    // If key presses are too slow (> 100ms apart), this is likely manual typing, reset buffer
    if (timeDiff > maxCharIntervalMs && buffer.length > 0) {
      buffer = ''
    }

    lastKeyTime = now

    if (e.key === 'Enter') {
      const trimmed = buffer.trim()
      if (trimmed.length >= minChars) {
        // Prevent default form submit or button click if active
        e.preventDefault()
        options.onScan(trimmed)
      }
      buffer = ''
    } else if (e.key.length === 1) {
      // Append alphanumeric / symbols
      buffer += e.key
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    isEnabled
  }
}
