<template>
  <div class="space-y-4 pb-20">
    <!-- SEARCH / SCAN BAR -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-2">
      <label class="block text-xs font-bold text-slate-700">Tra Cứu Nhanh Thùng hoặc Phụ Liệu:</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input 
            v-model="searchInput"
            @keyup.enter="handleLookup"
            type="text"
            placeholder="Quét mã Thùng (TH-...) hoặc Tem (ITEM-...)"
            class="w-full pl-9 pr-3 py-2.5 border-2 border-blue-500 rounded-xl text-sm font-mono font-bold uppercase focus:outline-none focus:ring-4 focus:ring-blue-100"
            autofocus
          />
          <Search class="w-4 h-4 text-blue-500 absolute left-3 top-3.5" />
        </div>
        <button 
          @click="handleLookup"
          :disabled="!searchInput.trim()"
          class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow active:scale-95"
        >
          Tra Cứu
        </button>
      </div>

      <!-- Quick sample codes for easy test -->
      <div class="flex flex-wrap gap-1.5 pt-1">
        <span class="text-[10px] text-slate-400 self-center">Thử nhanh:</span>
        <button 
          v-for="code in ['TH-00098', 'ITEM-CHI-DEN-001', 'ITEM-KHOA-DONG-001']" 
          :key="code"
          @click="quickSearch(code)"
          class="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-mono"
        >
          {{ code }}
        </button>
      </div>
    </div>

    <!-- RESULT 1: TRA CỨU THÙNG CARTON -->
    <div v-if="foundCarton" class="space-y-3">
      <div class="bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl p-4 shadow-md">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                Thông tin thùng
              </span>
              <span class="text-xs text-slate-300 font-semibold">{{ foundCarton.status }}</span>
            </div>
            <h2 class="text-2xl font-black font-mono tracking-tight mt-1 text-amber-300">
              {{ foundCarton.cartonId }}
            </h2>
          </div>

          <div class="text-right">
            <span class="text-xs text-slate-300 block">Vị trí kệ:</span>
            <span class="text-base font-bold font-mono text-emerald-400">
              {{ foundCarton.locationId || 'Chưa lên kệ' }}
            </span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <span>Thời gian tạo: {{ foundCarton.createdAt }}</span>
          <span class="font-bold text-white">{{ cartonItemList.length }} phụ liệu bên trong</span>
        </div>
      </div>

      <!-- Detail items inside this carton -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <h3 class="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
          Danh Sách Phụ Liệu Trong Thùng
        </h3>

        <div v-if="cartonItemList.length === 0" class="text-center py-6 text-xs text-slate-400">
          Thùng này hiện chưa có phụ liệu nào.
        </div>

        <div v-else class="space-y-2">
          <div 
            v-for="item in cartonItemList" 
            :key="item.id"
            class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1"
          >
            <div class="flex items-start justify-between">
              <span class="font-bold text-xs text-slate-900">{{ item.itemName }}</span>
              <span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                {{ item.qty }} {{ item.unit }}
              </span>
            </div>

            <div class="flex flex-wrap gap-x-3 text-[11px] text-slate-500 font-mono">
              <span class="text-blue-700 font-semibold">Tem: {{ item.childBarcode }}</span>
              <span>Đơn: {{ item.styleCode }}</span>
              <span>Phiếu: {{ item.orderId }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RESULT 2: TRA CỨU MÃ TEM PHỤ LIỆU -->
    <div v-else-if="foundItem" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Tag class="w-5 h-5 text-emerald-600" />
        <div>
          <h3 class="font-bold text-sm text-slate-800">Thông Tin Phụ Liệu</h3>
          <span class="text-[11px] font-mono text-emerald-700 font-bold">{{ foundItem.childBarcode }}</span>
        </div>
      </div>

      <div class="space-y-2 text-xs">
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Tên phụ liệu:</span>
          <span class="font-bold text-slate-800 text-right">{{ foundItem.itemName }}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Số lượng:</span>
          <span class="font-bold text-slate-800 font-mono">{{ foundItem.qty }} {{ foundItem.unit }}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Thuộc Thùng cha:</span>
          <span class="font-bold text-blue-700 font-mono">{{ foundItem.cartonId || 'Đã tách khỏi thùng' }}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Vị trí Kệ hiện tại:</span>
          <span class="font-bold text-purple-700 font-mono">{{ foundItem.locationId || 'Chưa lên kệ' }}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Mã đơn hàng / Style:</span>
          <span class="font-semibold text-slate-800">{{ foundItem.styleCode }}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Phiếu giám định:</span>
          <span class="font-semibold text-slate-800">{{ foundItem.orderId }}</span>
        </div>
        <div class="flex justify-between py-1">
          <span class="text-slate-500">Thời gian quét:</span>
          <span class="text-slate-600">{{ foundItem.scannedAt }}</span>
        </div>
      </div>
    </div>

    <!-- NOT FOUND STATE -->
    <div v-else-if="searched && !foundCarton && !foundItem" class="bg-white rounded-2xl p-8 text-center border border-slate-200">
      <AlertCircle class="w-10 h-10 text-rose-500 mx-auto mb-2" />
      <h4 class="font-bold text-sm text-slate-800">Không tìm thấy dữ liệu</h4>
      <p class="text-xs text-slate-500 mt-1">Mã "{{ lastSearchTerm }}" không khớp với thùng hay phụ liệu nào trong hệ thống.</p>
    </div>

    <!-- EMPTY INITIAL STATE -->
    <div v-else class="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
      Quét hoặc nhập mã Barcode để bắt đầu tra cứu thông tin chi tiết.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Tag, AlertCircle } from 'lucide-vue-next'
import { db } from '../database/db'
import type { Carton, CartonItem } from '../types'

const searchInput = ref('')
const lastSearchTerm = ref('')
const searched = ref(false)
const foundCarton = ref<Carton | null>(null)
const cartonItemList = ref<CartonItem[]>([])
const foundItem = ref<CartonItem | null>(null)

const handleLookup = async () => {
  const code = searchInput.value.trim().toUpperCase()
  if (!code) return

  searched.value = true
  lastSearchTerm.value = code
  foundCarton.value = null
  foundItem.value = null
  cartonItemList.value = []

  // 1. Try PostgreSQL API first
  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/lookup/${encodeURIComponent(code)}`)
      const result = await res.json()
      if (result.success) {
        if (result.type === 'CARTON') {
          foundCarton.value = result.data.carton
          cartonItemList.value = result.data.items || []
          return
        } else if (result.type === 'ITEM') {
          foundItem.value = result.data.item
          return
        }
      }
    } catch (err) {
      console.warn('Lookup API error, fallback to local Dexie:', err)
    }
  }

  // 2. Fallback to local Dexie
  const carton = await db.cartons.get(code)
  if (carton) {
    foundCarton.value = carton
    cartonItemList.value = await db.cartonItems.where('cartonId').equals(code).toArray()
    return
  }

  const item = await db.cartonItems.where('childBarcode').equals(code).first()
  if (item) {
    foundItem.value = item
    return
  }
}

const quickSearch = (code: string) => {
  searchInput.value = code
  handleLookup()
}
</script>
