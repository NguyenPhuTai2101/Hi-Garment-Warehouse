<template>
  <div class="space-y-4 pb-20">
    <!-- FEEDBACK BANNER -->
    <BarcodeFeedbackBanner 
      :feedback="putawayStore.lastFeedback" 
      @dismiss="putawayStore.lastFeedback = null" 
    />

    <!-- STEP 1: QUÉT / CHỌN VỊ TRÍ KỆ (LOCATION) -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Warehouse class="w-4 h-4 text-purple-600" />
          Bước 1: Chọn Vị Trí Kệ (Location)
        </label>
        <button 
          v-if="putawayStore.activeLocation" 
          @click="putawayStore.clearLocation"
          class="text-[11px] text-rose-600 font-semibold hover:underline"
        >
          Đổi kệ khác
        </button>
      </div>

      <!-- If location not selected yet -->
      <div v-if="!putawayStore.activeLocation" class="space-y-2">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input 
              v-model="locationInput"
              @keyup.enter="handleSetLocation"
              type="text"
              placeholder="Quét mã kệ (LOC-...)"
              class="w-full pl-9 pr-3 py-2.5 border-2 border-purple-500 rounded-xl text-sm font-mono font-bold uppercase focus:outline-none focus:ring-4 focus:ring-purple-100"
              autofocus
            />
            <MapPin class="w-4 h-4 text-purple-500 absolute left-3 top-3.5" />
          </div>
          <button 
            @click="handleSetLocation"
            :disabled="!locationInput.trim()"
            class="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow active:scale-95"
          >
            Chọn Kệ
          </button>
        </div>

        <!-- Quick location chips -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <span class="text-[10px] text-slate-400 self-center">Gợi ý nhanh:</span>
          <button 
            v-for="loc in quickLocations" 
            :key="loc"
            @click="quickSelectLocation(loc)"
            class="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-mono font-semibold"
          >
            {{ loc }}
          </button>
        </div>
      </div>

      <!-- If location active -->
      <div v-else class="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Kệ đang chọn</span>
          <h3 class="text-xl font-black font-mono text-purple-900 leading-tight">
            {{ putawayStore.activeLocation.locationId }}
          </h3>
          <p class="text-[11px] text-purple-700 mt-0.5">
            {{ putawayStore.activeLocation.zone }} - {{ putawayStore.activeLocation.description }}
          </p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow">
          <Check class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- STEP 2: CẤT NGUYÊN THÙNG HOẶC XÉ LẺ -->
    <div v-if="putawayStore.activeLocation" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <label class="text-xs font-bold text-slate-700">Bước 2: Quét Mã Cất Lên Kệ</label>
        
        <!-- Tab chuyển mode: Cất Thùng vs Cất Lẻ -->
        <div class="flex bg-slate-100 p-0.5 rounded-lg text-xs">
          <button 
            @click="putawayStore.putawayMode = 'CARTON'"
            :class="putawayStore.putawayMode === 'CARTON' ? 'bg-white text-blue-700 font-bold shadow' : 'text-slate-500'"
            class="px-2.5 py-1 rounded-md transition-all"
          >
            Cất Nguyên Thùng
          </button>
          <button 
            @click="putawayStore.putawayMode = 'ITEM'"
            :class="putawayStore.putawayMode === 'ITEM' ? 'bg-white text-emerald-700 font-bold shadow' : 'text-slate-500'"
            class="px-2.5 py-1 rounded-md transition-all"
          >
            Xé Lẻ Từng Món
          </button>
        </div>
      </div>

      <!-- Input Putaway -->
      <div class="space-y-2">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input 
              v-model="targetBarcodeInput"
              @keyup.enter="handleExecutePutaway"
              type="text"
              :placeholder="putawayStore.putawayMode === 'CARTON' ? 'Quét mã Thùng (TH-...)' : 'Quét tem phụ liệu (ITEM-...)'"
              class="w-full pl-9 pr-3 py-2.5 border-2 rounded-xl text-sm font-mono font-bold uppercase focus:outline-none focus:ring-4"
              :class="putawayStore.putawayMode === 'CARTON' ? 'border-blue-500 focus:ring-blue-100' : 'border-emerald-500 focus:ring-emerald-100'"
              autofocus
            />
            <Box v-if="putawayStore.putawayMode === 'CARTON'" class="w-4 h-4 text-blue-500 absolute left-3 top-3.5" />
            <Tag v-else class="w-4 h-4 text-emerald-500 absolute left-3 top-3.5" />
          </div>
          <button 
            @click="handleExecutePutaway"
            :disabled="!targetBarcodeInput.trim()"
            class="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow active:scale-95 transition-all"
            :class="putawayStore.putawayMode === 'CARTON' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'"
          >
            Cất Kệ
          </button>
        </div>

        <p class="text-[11px] text-slate-500 italic">
          <span v-if="putawayStore.putawayMode === 'CARTON'">
            💡 <b>Thừa kế vị trí:</b> Toàn bộ phụ liệu bên trong thùng sẽ tự động thừa hưởng vị trí của kệ này.
          </span>
          <span v-else>
            💡 <b>Xé lẻ:</b> Món phụ liệu được cất riêng sẽ tự động tách khỏi mã thùng cha ban đầu.
          </span>
        </p>
      </div>
    </div>

    <!-- RECENT PUTAWAYS -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <h3 class="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Lịch Sử Cất Kệ Vừa Thực Hiện</h3>
      
      <div v-if="putawayStore.recentPutaways.length === 0" class="text-xs text-slate-400 text-center py-4">
        Chưa có lượt cất kệ nào trong phiên làm việc này.
      </div>

      <div v-else class="space-y-1.5 max-h-48 overflow-y-auto">
        <div 
          v-for="(item, idx) in putawayStore.recentPutaways" 
          :key="idx"
          class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
        >
          <div class="flex items-center gap-2">
            <span 
              :class="item.type === 'Thùng nguyên' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
              class="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
            >
              {{ item.type }}
            </span>
            <span class="font-mono font-bold text-slate-800">{{ item.code }}</span>
          </div>

          <div class="text-right">
            <span class="font-mono text-purple-700 font-bold">➡️ {{ item.location }}</span>
            <span class="text-[10px] text-slate-400 block">{{ item.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Warehouse, MapPin, Check, Box, Tag } from 'lucide-vue-next'
import { usePutawayStore } from '../stores/putawayStore'
import BarcodeFeedbackBanner from '../components/BarcodeFeedbackBanner.vue'

const route = useRoute()
const putawayStore = usePutawayStore()

const locationInput = ref('')
const targetBarcodeInput = ref('')
const quickLocations = ['LOC-A1-01', 'LOC-A1-02', 'LOC-B2-01', 'LOC-C3-01']

onMounted(() => {
  if (route.query.carton) {
    targetBarcodeInput.value = String(route.query.carton)
    putawayStore.putawayMode = 'CARTON'
  }
})

const handleSetLocation = async () => {
  if (!locationInput.value.trim()) return
  const success = await putawayStore.setLocation(locationInput.value)
  if (success) {
    locationInput.value = ''
  }
}

const quickSelectLocation = async (loc: string) => {
  await putawayStore.setLocation(loc)
}

const handleExecutePutaway = async () => {
  if (!targetBarcodeInput.value.trim()) return

  if (putawayStore.putawayMode === 'CARTON') {
    await putawayStore.putawayCarton(targetBarcodeInput.value)
  } else {
    await putawayStore.putawaySingleItem(targetBarcodeInput.value)
  }

  targetBarcodeInput.value = ''
}
</script>
