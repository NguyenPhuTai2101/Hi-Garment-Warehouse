<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Printer class="w-5 h-5 text-amber-300" />
          <h3 class="font-bold text-sm">Xem & In Tem Thùng (Packing Label)</h3>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg hover:bg-blue-700 text-blue-200">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Thermal Label Preview (Mô phỏng con tem decal nhiệt 50x30mm) -->
      <div class="p-5 bg-slate-100 flex justify-center">
        <div class="bg-white border-2 border-dashed border-slate-400 rounded-lg p-4 w-72 shadow-md space-y-2 text-slate-900 select-none">
          <div class="flex items-center justify-between border-b border-slate-300 pb-1.5">
            <span class="font-black text-xs tracking-wider">WMS KHO PHỤ LIỆU</span>
            <span class="text-[10px] font-bold bg-slate-200 px-1.5 py-0.5 rounded">MIXED CARTON</span>
          </div>

          <!-- Barcode Visualization -->
          <div class="text-center py-2 space-y-1">
            <div class="font-mono text-xl font-black tracking-widest text-slate-900">
              {{ carton?.cartonId }}
            </div>
            <!-- Mock Barcode Stripes -->
            <div class="h-10 w-full flex items-center justify-center gap-0.5 px-4 overflow-hidden">
              <div v-for="n in 36" :key="n" :class="n % 3 === 0 ? 'w-1 bg-black' : (n % 2 === 0 ? 'w-0.5 bg-black' : 'w-1.5 bg-black')" class="h-full"></div>
            </div>
          </div>

          <div class="text-xs space-y-1 border-t border-slate-200 pt-1.5">
            <div class="flex justify-between">
              <span class="text-slate-500">Số lượng:</span>
              <span class="font-bold font-mono text-blue-700">{{ carton?.totalItemsCount || items.length }} phụ liệu</span>
            </div>
            <div class="flex justify-between text-[11px]">
              <span class="text-slate-500">Trạng thái:</span>
              <span class="font-semibold text-emerald-700">{{ carton?.status === 'CLOSED' ? 'ĐÃ ĐÓNG THÙNG' : 'ĐANG MỞ' }}</span>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400">
              <span>Ngày tạo:</span>
              <span>{{ carton?.createdAt }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="p-4 bg-white border-t border-slate-200 flex flex-col gap-2">
        <button 
          @click="handlePrint"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition-all"
        >
          <Printer class="w-4 h-4" />
          <span>Gửi Lệnh In Tem (Print)</span>
        </button>

        <button 
          @click="$emit('close')"
          class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
        >
          Đóng lại
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Printer, X } from 'lucide-vue-next'
import type { Carton, CartonItem } from '../types'
import { useSoundAndHaptic } from '../composables/useSoundAndHaptic'
import { useBluetoothPrinter } from '../composables/useBluetoothPrinter'

const props = defineProps<{
  isOpen: boolean
  carton: Carton | null
  items: CartonItem[]
}>()

const emit = defineEmits(['close'])
const { playSuccess } = useSoundAndHaptic()
const { printLabel } = useBluetoothPrinter()

const handlePrint = async () => {
  if (!props.carton) return
  playSuccess()
  await printLabel(
    props.carton.cartonId,
    'THUNG HON HOP WMS',
    `So mon: ${props.carton.totalItemsCount}`,
    `${props.carton.totalItemsCount} phu lieu`
  )
  alert(`Đã gửi lệnh in tem cho thùng ${props.carton.cartonId}!`)
  emit('close')
}
</script>
