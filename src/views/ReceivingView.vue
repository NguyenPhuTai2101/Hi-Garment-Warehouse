<template>
  <div class="space-y-4 pb-20">
    <!-- FEEDBACK BANNER -->
    <BarcodeFeedbackBanner 
      :feedback="cartonStore.lastFeedback" 
      @dismiss="cartonStore.clearFeedback" 
    />

    <!-- STEP 1: CHƯA CÓ THÙNG NÀO ACTIVE -->
    <div v-if="!cartonStore.activeCarton" class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div class="text-center py-4 space-y-3">
        <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
          <Box class="w-8 h-8" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-800">Bước 1: Kích Hoạt Thùng Carton</h2>
          <p class="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Dán tem Carton ID lên vỏ thùng vật lý và quét mã để bắt đầu đếm phụ liệu hỗn hợp.
          </p>
        </div>

        <!-- Input quét mã thùng -->
        <div class="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
          <div class="relative">
            <input 
              v-model="cartonInput"
              @keyup.enter="handleActivateCarton"
              type="text"
              placeholder="Quét hoặc nhập mã thùng (TH-...)"
              class="w-full pl-9 pr-3 py-3 border-2 border-blue-500 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 uppercase"
              autofocus
            />
            <Scan class="w-4 h-4 text-blue-500 absolute left-3 top-3.5" />
          </div>

          <div class="flex gap-2">
            <button 
              @click="handleActivateCarton"
              :disabled="!cartonInput.trim()"
              class="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow active:scale-95 transition-all"
            >
              Mở Thùng Này
            </button>
            <button 
              @click="generateRandomCarton"
              class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold active:scale-95 transition-all flex items-center gap-1"
              title="Sinh mã thùng ngẫu nhiên"
            >
              <Sparkles class="w-3.5 h-3.5 text-amber-500" />
              Mã mới
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 2: ĐÃ CÓ THÙNG ACTIVE -->
    <div v-else class="space-y-4">
      <!-- CARTON HEADER CARD -->
      <div 
        :class="cartonStore.activeCarton.status === 'CLOSED' ? 'from-emerald-700 to-teal-800' : 'from-blue-700 to-indigo-800'"
        class="bg-gradient-to-r text-white rounded-2xl p-4 shadow-md relative overflow-hidden transition-all duration-300"
      >
        <div class="flex items-start justify-between relative z-10">
          <div>
            <div class="flex items-center gap-2">
              <span 
                :class="cartonStore.activeCarton.status === 'CLOSED' ? 'bg-emerald-400 text-slate-900' : 'bg-white/20 text-white'"
                class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm"
              >
                {{ cartonStore.activeCarton.status === 'CLOSED' ? '✓ ĐÃ ĐÓNG THÙNG (XONG)' : '● THÙNG ĐANG MỞ' }}
              </span>
              <span class="text-xs text-blue-100">{{ cartonStore.activeCarton.createdAt }}</span>
            </div>
            <h2 class="text-2xl font-black font-mono tracking-tight mt-1 text-white">
              {{ cartonStore.activeCarton.cartonId }}
            </h2>
          </div>

          <div class="text-right">
            <span class="text-3xl font-black text-amber-300 font-mono">
              {{ cartonStore.activeCarton.totalItemsCount }}
            </span>
            <span class="text-xs text-blue-100 block">món trong thùng</span>
          </div>
        </div>

        <!-- ACTION BAR KHI THÙNG ĐANG MỞ (OPEN) -->
        <div v-if="cartonStore.activeCarton.status !== 'CLOSED'" class="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-2 relative z-10">
          <button 
            @click="handleCloseCarton"
            class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-transform"
          >
            <CheckSquare class="w-4 h-4" />
            Đóng thùng (Xong)
          </button>

          <div class="flex gap-2">
            <button 
              @click="isPrintModalOpen = true"
              class="px-3 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-transform"
              title="In tem dán thùng"
            >
              <Printer class="w-4 h-4" />
              In tem
            </button>
            <button 
              @click="handleClearCarton"
              class="px-3 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-semibold transition-transform"
            >
              Đổi thùng
            </button>
          </div>
        </div>

        <!-- ACTION BAR KHI THÙNG ĐÃ ĐÓNG (CLOSED) -->
        <div v-else class="mt-4 pt-3 border-t border-white/20 flex flex-col gap-2 relative z-10">
          <div class="flex gap-2">
            <button 
              @click="goToPutaway(cartonStore.activeCarton.cartonId)"
              class="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1.5 transition-transform"
            >
              <Warehouse class="w-4 h-4" />
              Cất Thùng Lên Kệ Ngay
            </button>
            <button 
              @click="isPrintModalOpen = true"
              class="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Printer class="w-4 h-4" />
              In tem
            </button>
          </div>
          
          <div class="flex gap-2">
            <button 
              @click="handleClearCarton"
              class="flex-1 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-semibold"
            >
              ➕ Mở Thùng Khác
            </button>
            <button 
              @click="router.push('/cartons')"
              class="flex-1 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Package class="w-3.5 h-3.5" />
              Xem DS Thùng
            </button>
          </div>
        </div>
      </div>

      <!-- SCAN INPUT FOR CHILD ACCESSORIES (CHỈ HIỂN THỊ KHI THÙNG ĐANG MỞ) -->
      <div v-if="cartonStore.activeCarton.status !== 'CLOSED'" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-2">
        <label class="block text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Quét Tem Phụ Liệu (Child Barcode):</span>
          <span class="text-[11px] text-blue-600 font-normal">Súng quét tự động nhận</span>
        </label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input 
              ref="itemInputRef"
              v-model="itemBarcodeInput"
              @keyup.enter="handleScanChildItem"
              type="text"
              placeholder="Quét tem phụ liệu (ITEM-...)"
              class="w-full pl-9 pr-3 py-2.5 border-2 border-emerald-500 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 uppercase"
            />
            <Tag class="w-4 h-4 text-emerald-600 absolute left-3 top-3.5" />
          </div>
          <button 
            @click="handleScanChildItem"
            :disabled="!itemBarcodeInput.trim() || cartonStore.isProcessing"
            class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow active:scale-95 transition-all"
          >
            Nhận
          </button>
        </div>
      </div>

      <!-- BANNER NHẮC KHI THÙNG ĐÃ ĐÓNG -->
      <div v-else class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
        <CheckSquare class="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Thùng đã hoàn tất kiểm đếm. Hãy đưa thùng lên kệ lưu trữ hoặc bấm <b>"Mở Thùng Khác"</b> để tiếp tục.</span>
      </div>

      <!-- ITEMS SCANNED IN CURRENT CARTON -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Layers class="w-4 h-4 text-blue-600" />
            Chi Tiết Trong Thùng ({{ cartonStore.activeCartonItems.length }})
          </h3>
          <span class="text-[11px] text-slate-500">Mới nhất ở trên</span>
        </div>

        <div v-if="cartonStore.activeCartonItems.length === 0" class="text-center py-8 text-slate-400 text-xs">
          Chưa có món nào được quét vào thùng. Hãy lấy từng gói phụ liệu và quét tem!
        </div>

        <div v-else class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          <div 
            v-for="(item, idx) in cartonStore.activeCartonItems" 
            :key="item.id || idx"
            class="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
          >
            <div class="min-w-0 flex-1 pr-2">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-slate-800 truncate">{{ item.itemName }}</span>
              </div>
              <div class="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap gap-x-2">
                <span class="text-blue-700 font-semibold">{{ item.childBarcode }}</span>
                <span>• Đơn: {{ item.styleCode }}</span>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span class="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                +{{ item.qty }} {{ item.unit }}
              </span>
              <span class="text-[10px] text-slate-400 block mt-0.5">{{ item.scannedAt.split(' ')[1] || item.scannedAt }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL IN TEM NHÃN -->
    <PrintLabelModal 
      :is-open="isPrintModalOpen"
      :carton="cartonStore.activeCarton"
      :items="cartonStore.activeCartonItems"
      @close="isPrintModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Box, Scan, Sparkles, CheckSquare, Printer, Tag, Layers, Warehouse, Package } from 'lucide-vue-next'
import { useCartonStore } from '../stores/cartonStore'
import BarcodeFeedbackBanner from '../components/BarcodeFeedbackBanner.vue'
import PrintLabelModal from '../components/PrintLabelModal.vue'

const router = useRouter()
const cartonStore = useCartonStore()

const cartonInput = ref('')
const itemBarcodeInput = ref('')
const itemInputRef = ref<HTMLInputElement | null>(null)
const isPrintModalOpen = ref(false)

const handleActivateCarton = async () => {
  if (!cartonInput.value.trim()) return
  const success = await cartonStore.activateCarton(cartonInput.value)
  if (success) {
    cartonInput.value = ''
    setTimeout(() => {
      itemInputRef.value?.focus()
    }, 100)
  }
}

const generateRandomCarton = () => {
  const rand = Math.floor(1000 + Math.random() * 9000)
  cartonInput.value = `TH-0${rand}`
}

const handleScanChildItem = async () => {
  if (!itemBarcodeInput.value.trim()) return
  const success = await cartonStore.scanChildItem(itemBarcodeInput.value)
  if (success) {
    itemBarcodeInput.value = ''
  }
  itemInputRef.value?.focus()
}

const handleCloseCarton = async () => {
  await cartonStore.closeCarton()
}

const handleClearCarton = () => {
  cartonStore.clearActiveCarton()
  cartonInput.value = ''
}

const goToPutaway = (cartonId: string) => {
  router.push({ path: '/putaway', query: { carton: cartonId } })
}

onMounted(() => {
  if (cartonStore.activeCarton && cartonStore.activeCarton.status !== 'CLOSED') {
    itemInputRef.value?.focus()
  }
})
</script>
