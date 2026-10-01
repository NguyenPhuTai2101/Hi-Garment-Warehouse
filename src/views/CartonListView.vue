<template>
  <div class="space-y-4 pb-20">
    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-800">Quản Lý Thùng Carton</h2>
        <p class="text-xs text-slate-500">Danh sách và trạng thái toàn bộ thùng hàng</p>
      </div>

      <div class="flex items-center gap-1.5">
        <button 
          @click="loadCartons"
          class="p-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1"
          title="Làm mới"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="isLoading ? 'animate-spin' : ''" />
          <span>Làm mới</span>
        </button>
      </div>
    </div>

    <!-- SUMMARY COUNTER STATS -->
    <div class="grid grid-cols-4 gap-1.5 text-center">
      <div 
        @click="filterStatus = 'ALL'"
        :class="filterStatus === 'ALL' ? 'ring-2 ring-blue-500 bg-white' : 'bg-white/80'"
        class="p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm transition-all"
      >
        <span class="text-[10px] text-slate-400 font-bold block">TẤT CẢ</span>
        <span class="text-base font-black font-mono text-slate-800">{{ stats.total }}</span>
      </div>

      <div 
        @click="filterStatus = 'OPEN'"
        :class="filterStatus === 'OPEN' ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'bg-white/80'"
        class="p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm transition-all"
      >
        <span class="text-[10px] text-blue-600 font-bold block">ĐANG MỞ</span>
        <span class="text-base font-black font-mono text-blue-700">{{ stats.open }}</span>
      </div>

      <div 
        @click="filterStatus = 'CLOSED'"
        :class="filterStatus === 'CLOSED' ? 'ring-2 ring-amber-500 bg-amber-50/50' : 'bg-white/80'"
        class="p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm transition-all"
      >
        <span class="text-[10px] text-amber-600 font-bold block">CHỜ KỆ</span>
        <span class="text-base font-black font-mono text-amber-600">{{ stats.closed }}</span>
      </div>

      <div 
        @click="filterStatus = 'STORED'"
        :class="filterStatus === 'STORED' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'bg-white/80'"
        class="p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm transition-all"
      >
        <span class="text-[10px] text-emerald-600 font-bold block">ĐÃ LƯU</span>
        <span class="text-base font-black font-mono text-emerald-700">{{ stats.stored }}</span>
      </div>
    </div>

    <!-- SEARCH BAR -->
    <div class="relative">
      <input 
        v-model="searchTerm"
        type="text"
        placeholder="Tìm mã thùng (TH-...) hoặc vị trí kệ..."
        class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
    </div>

    <!-- CARTON CARDS LIST -->
    <div v-if="filteredCartons.length === 0" class="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
      <Inbox class="w-10 h-10 mx-auto mb-2 text-slate-300" />
      Không tìm thấy thùng nào phù hợp với bộ lọc.
    </div>

    <div v-else class="space-y-3">
      <div 
        v-for="carton in filteredCartons" 
        :key="carton.cartonId"
        class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3 transition-all hover:border-blue-300"
      >
        <!-- Top row: ID & Status -->
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-base font-black text-slate-900 tracking-tight">
                {{ carton.cartonId }}
              </span>
              <span 
                :class="statusBadgeClasses(carton.status)"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {{ statusLabel(carton.status) }}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Tạo lúc: {{ carton.createdAt }}</p>
          </div>

          <div class="text-right">
            <span class="text-lg font-black font-mono text-blue-700">
              {{ carton.actualItemsCount ?? carton.totalItemsCount }}
            </span>
            <span class="text-[10px] text-slate-400 block leading-none">phụ liệu</span>
          </div>
        </div>

        <!-- Middle row: Location Info -->
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-slate-600">
            <Warehouse class="w-4 h-4 text-purple-600 shrink-0" />
            <span class="text-[11px]">Vị trí lưu kho:</span>
          </div>
          <span 
            :class="carton.locationId ? 'text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md' : 'text-slate-400 italic'"
            class="font-mono text-xs"
          >
            {{ carton.locationId || 'Chưa cất lên kệ' }}
          </span>
        </div>

        <!-- Action row -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-100 gap-1.5">
          <!-- Toggle items details -->
          <button 
            @click="toggleDetails(carton.cartonId)"
            class="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1 py-1"
          >
            <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="expandedCartonId === carton.cartonId ? 'rotate-180' : ''" />
            <span>{{ expandedCartonId === carton.cartonId ? 'Ẩn chi tiết' : 'Xem phụ liệu' }}</span>
          </button>

          <div class="flex items-center gap-1">
            <!-- In tem -->
            <button 
              @click="openPrintModal(carton)"
              class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="In tem thùng"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>In tem</span>
            </button>

            <!-- Cất kệ nếu chưa STORED -->
            <button 
              v-if="carton.status !== 'STORED'"
              @click="goToPutaway(carton.cartonId)"
              class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
              title="Cất thùng này lên kệ"
            >
              <ArrowUpToLine class="w-3.5 h-3.5" />
              <span>Lên kệ</span>
            </button>

            <!-- Mở lại để quét tiếp nếu là OPEN -->
            <button 
              v-if="carton.status === 'OPEN'"
              @click="resumeCarton(carton.cartonId)"
              class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Play class="w-3.5 h-3.5" />
              <span>Quét tiếp</span>
            </button>
          </div>
        </div>

        <!-- EXPANDED DETAIL ITEMS -->
        <div v-if="expandedCartonId === carton.cartonId" class="pt-2 border-t border-slate-200 space-y-1.5 animate-in fade-in duration-150">
          <div v-if="isLoadingDetails" class="text-xs text-slate-400 text-center py-2">
            Đang tải danh sách phụ liệu...
          </div>
          <div v-else-if="currentCartonItems.length === 0" class="text-xs text-slate-400 text-center py-2">
            Thùng này hiện chưa có món nào.
          </div>
          <div 
            v-else 
            v-for="item in currentCartonItems" 
            :key="item.id"
            class="p-2 bg-slate-100/70 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
          >
            <div class="min-w-0 pr-2">
              <div class="font-bold text-slate-800 truncate">{{ item.itemName }}</div>
              <div class="text-[10px] text-slate-500 font-mono">{{ item.childBarcode }} • {{ item.styleCode }}</div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                {{ item.qty }} {{ item.unit }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL IN TEM NHÃN -->
    <PrintLabelModal 
      :is-open="isPrintModalOpen"
      :carton="selectedCartonForPrint"
      :items="[]"
      @close="isPrintModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshCw, Search, Inbox, Warehouse, ChevronDown, Printer, ArrowUpToLine, Play } from 'lucide-vue-next'
import { db } from '../database/db'
import { useCartonStore } from '../stores/cartonStore'
import type { Carton, CartonItem, CartonStatus } from '../types'
import PrintLabelModal from '../components/PrintLabelModal.vue'

const router = useRouter()
const cartonStore = useCartonStore()

const cartons = ref<Array<Carton & { actualItemsCount?: number }>>([])
const isLoading = ref(false)
const filterStatus = ref<'ALL' | CartonStatus>('ALL')
const searchTerm = ref('')

const expandedCartonId = ref<string | null>(null)
const currentCartonItems = ref<CartonItem[]>([])
const isLoadingDetails = ref(false)

const isPrintModalOpen = ref(false)
const selectedCartonForPrint = ref<Carton | null>(null)

const stats = computed(() => {
  const total = cartons.value.length
  const open = cartons.value.filter(c => c.status === 'OPEN').length
  const closed = cartons.value.filter(c => c.status === 'CLOSED').length
  const stored = cartons.value.filter(c => c.status === 'STORED').length
  return { total, open, closed, stored }
})

const filteredCartons = computed(() => {
  return cartons.value.filter(c => {
    const matchStatus = filterStatus.value === 'ALL' || c.status === filterStatus.value
    const term = searchTerm.value.trim().toUpperCase()
    const matchSearch = !term || 
      c.cartonId.includes(term) || 
      (c.locationId && c.locationId.includes(term))
    return matchStatus && matchSearch
  })
})

const loadCartons = async () => {
  isLoading.value = true
  try {
    if (navigator.onLine) {
      const res = await fetch('/api/cartons')
      const result = await res.json()
      if (result.success && result.data) {
        cartons.value = result.data
        isLoading.value = false
        return
      }
    }
  } catch (err) {
    console.warn('API get cartons failed, fallback to local Dexie:', err)
  }

  // Fallback to local Dexie
  const localCartons = await db.cartons.toArray()
  cartons.value = localCartons.map(c => ({
    ...c,
    actualItemsCount: c.totalItemsCount
  }))
  isLoading.value = false
}

const toggleDetails = async (cartonId: string) => {
  if (expandedCartonId.value === cartonId) {
    expandedCartonId.value = null
    currentCartonItems.value = []
    return
  }

  expandedCartonId.value = cartonId
  isLoadingDetails.value = true

  try {
    if (navigator.onLine) {
      const res = await fetch(`/api/cartons/${encodeURIComponent(cartonId)}`)
      const result = await res.json()
      if (result.success && result.data) {
        currentCartonItems.value = result.data.items || []
        isLoadingDetails.value = false
        return
      }
    }
  } catch (err) {
    console.warn('Get carton details error:', err)
  }

  // Fallback Dexie
  currentCartonItems.value = await db.cartonItems.where('cartonId').equals(cartonId).toArray()
  isLoadingDetails.value = false
}

const openPrintModal = (carton: Carton) => {
  selectedCartonForPrint.value = carton
  isPrintModalOpen.value = true
}

const goToPutaway = (cartonId: string) => {
  router.push({ path: '/putaway', query: { carton: cartonId } })
}

const resumeCarton = async (cartonId: string) => {
  await cartonStore.activateCarton(cartonId)
  router.push('/receiving')
}

const statusBadgeClasses = (status: CartonStatus) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800'
    case 'CLOSED':
      return 'bg-amber-100 text-amber-800'
    case 'STORED':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

const statusLabel = (status: CartonStatus) => {
  switch (status) {
    case 'OPEN': return 'Đang mở'
    case 'CLOSED': return 'Chờ lên kệ'
    case 'STORED': return 'Đã lên kệ'
    default: return status
  }
}

onMounted(() => {
  loadCartons()
})
</script>
