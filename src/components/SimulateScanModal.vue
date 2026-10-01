<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <ScanLine class="w-5 h-5 text-amber-400" />
          <h3 class="font-bold text-sm">Giả Lập Quét Mã Barcode</h3>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-lg hover:bg-slate-700 text-slate-300">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4 overflow-y-auto">
        <!-- Manual input -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Nhập Barcode bất kỳ (hoặc dùng súng quét):</label>
          <div class="flex gap-2">
            <input 
              v-model="inputCode"
              @keyup.enter="handleScan(inputCode)"
              type="text" 
              placeholder="VD: TH-00101, ITEM-CHI-DEN-003..."
              class="flex-1 px-3 py-2 text-sm border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              autofocus
            />
            <button 
              @click="handleScan(inputCode)"
              :disabled="!inputCode.trim()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold active:scale-95 shadow"
            >
              Quét
            </button>
          </div>
        </div>

        <hr class="border-slate-200" />

        <!-- Preset buttons for easy testing -->
        <div class="space-y-3">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Barcode Mẫu (Bấm để quét ngay):</p>

          <!-- 1. Carton Barcodes -->
          <div>
            <div class="text-[11px] font-semibold text-blue-700 mb-1 flex items-center gap-1">
              <Box class="w-3.5 h-3.5" /> Mã Thùng (Carton ID)
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <button 
                v-for="code in sampleCartons" 
                :key="code"
                @click="handleScan(code)"
                class="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-mono font-semibold truncate active:scale-95"
              >
                {{ code }}
              </button>
            </div>
          </div>

          <!-- 2. Child Item Barcodes -->
          <div>
            <div class="text-[11px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
              <Tag class="w-3.5 h-3.5" /> Mã Tem Phụ Liệu (Child Barcode)
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button 
                v-for="item in sampleItems" 
                :key="item.code"
                @click="handleScan(item.code)"
                class="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-left text-xs active:scale-95"
              >
                <div class="font-mono font-bold text-[11px] truncate">{{ item.code }}</div>
                <div class="text-[10px] text-emerald-700 truncate">{{ item.name }}</div>
              </button>
            </div>
          </div>

          <!-- 3. Location Barcodes -->
          <div>
            <div class="text-[11px] font-semibold text-purple-700 mb-1 flex items-center gap-1">
              <Warehouse class="w-3.5 h-3.5" /> Mã Vị Trí Kệ (Location ID)
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <button 
                v-for="loc in sampleLocations" 
                :key="loc"
                @click="handleScan(loc)"
                class="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-mono font-semibold truncate active:scale-95"
              >
                {{ loc }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
        >
          Đóng lại
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ScanLine, X, Box, Tag, Warehouse } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'scan'])

const inputCode = ref('')

const sampleCartons = ['TH-00101', 'TH-00102', 'TH-00098']

const sampleItems = [
  { code: 'ITEM-CHI-DEN-003', name: 'Chỉ may Đen 40/2 (Áo khoác)' },
  { code: 'ITEM-KHOA-DONG-002', name: 'Khóa kéo đồng 15cm (Áo khoác)' },
  { code: 'ITEM-CUC-TRANG-002', name: 'Cúc 4 lỗ trắng 11mm (Sơ mi)' },
  { code: 'ITEM-CHI-TRANG-001', name: 'Chỉ may Trắng 40/2 (Sơ mi)' },
  { code: 'ITEM-BO-CO-POLO-001', name: 'Bo cổ dệt Jacquard (Polo)' },
  { code: 'ITEM-CHUN-LUNG-001', name: 'Chun dệt thoi 3cm (Polo)' }
]

const sampleLocations = ['LOC-A1-01', 'LOC-A1-02', 'LOC-B2-01', 'LOC-C3-01']

const handleScan = (code: string) => {
  if (!code || !code.trim()) return
  emit('scan', code.trim().toUpperCase())
  inputCode.value = ''
  emit('close')
}
</script>
