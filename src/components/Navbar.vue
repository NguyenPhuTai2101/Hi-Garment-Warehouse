<template>
  <header class="bg-blue-800 text-white px-4 py-3 shadow-md sticky top-0 z-30 select-none">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
          SC
        </div>
        <div>
          <h1 class="text-base font-bold leading-none tracking-tight">ScanCarton PWA</h1>
          <p class="text-[11px] text-blue-200 leading-tight">WMS Kho Phụ Liệu May</p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Online/Offline Badge -->
        <span 
          :class="isOnline ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-rose-500/20 text-rose-200 border-rose-400/30'"
          class="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
        >
          <span :class="isOnline ? 'bg-emerald-400' : 'bg-rose-400'" class="w-1.5 h-1.5 rounded-full inline-block animate-pulse"></span>
          {{ isOnline ? 'Online' : 'Offline' }}
        </span>

        <!-- Test Beep Button -->
        <button 
          @click="testBeep" 
          title="Thử âm thanh Beep"
          class="p-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 active:scale-95 text-xs text-blue-100 flex items-center"
        >
          <Volume2 class="w-4 h-4" />
        </button>

        <!-- Quick Scan Modal Toggle -->
        <button 
          @click="$emit('open-simulate-scan')" 
          title="Nhập / Giả lập Barcode"
          class="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-xs text-slate-900 font-semibold flex items-center gap-1 shadow"
        >
          <Keyboard class="w-4 h-4" />
          <span class="hidden sm:inline text-xs">Quét ảo</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Volume2, Keyboard } from 'lucide-vue-next'
import { useSoundAndHaptic } from '../composables/useSoundAndHaptic'

defineEmits(['open-simulate-scan'])

const isOnline = ref(navigator.onLine)
const { playSuccess } = useSoundAndHaptic()

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

const testBeep = () => {
  playSuccess()
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>
