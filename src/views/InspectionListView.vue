<template>
  <div class="space-y-4 pb-20">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-800">Phiếu Giám Định (QC Orders)</h2>
        <p class="text-xs text-slate-500">Tiến độ trừ lùi kiểm đếm theo từng mã hàng</p>
      </div>

      <button 
        @click="loadOrders" 
        class="p-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="isLoading ? 'animate-spin' : ''" />
        Làm mới
      </button>
    </div>

    <!-- ORDERS LIST -->
    <div class="space-y-3">
      <div 
        v-for="order in orders" 
        :key="order.orderId"
        class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3"
      >
        <!-- Header of Order -->
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span 
                :class="statusBadgeClasses(order.status)"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {{ statusLabel(order.status) }}
              </span>
              <span class="text-xs text-slate-400 font-mono">{{ order.orderId }}</span>
            </div>
            <h3 class="font-bold text-sm text-slate-900 mt-1">{{ order.styleCode }}</h3>
            <p class="text-[11px] text-slate-500">NCC: {{ order.vendor }}</p>
          </div>

          <!-- Overall Percentage -->
          <div class="text-right">
            <span class="text-lg font-black font-mono text-blue-700">
              {{ calculateOrderProgress(order) }}%
            </span>
            <span class="text-[10px] text-slate-400 block">Hoàn thành</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-500 rounded-full"
            :class="calculateOrderProgress(order) === 100 ? 'bg-emerald-500' : 'bg-blue-600'"
            :style="{ width: `${calculateOrderProgress(order)}%` }"
          ></div>
        </div>

        <!-- Detail items in this inspection order -->
        <div class="border-t border-slate-100 pt-2 space-y-1.5">
          <div 
            v-for="it in order.items" 
            :key="it.id"
            class="flex items-center justify-between text-xs py-1"
          >
            <div class="min-w-0 pr-2">
              <div class="font-medium text-slate-800 truncate">{{ it.itemName }}</div>
              <div class="text-[10px] font-mono text-slate-400">{{ it.itemCode }}</div>
            </div>

            <div class="shrink-0 font-mono text-right">
              <span 
                :class="it.receivedQty >= it.plannedQty ? 'text-emerald-700 font-bold' : 'text-slate-700 font-semibold'"
              >
                {{ it.receivedQty }} / {{ it.plannedQty }}
              </span>
              <span class="text-[10px] text-slate-400 ml-1">{{ it.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { db } from '../database/db'
import type { InspectionOrder, InspectionStatus } from '../types'

const orders = ref<InspectionOrder[]>([])
const isLoading = ref(false)

const loadOrders = async () => {
  isLoading.value = true
  try {
    if (navigator.onLine) {
      const res = await fetch('/api/orders')
      const result = await res.json()
      if (result.success && result.data) {
        orders.value = result.data
        // Cache to local Dexie
        await db.inspectionOrders.bulkPut(result.data)
        isLoading.value = false
        return
      }
    }
  } catch (err) {
    console.warn('Load orders API failed, loading from local Dexie:', err)
  }

  orders.value = await db.inspectionOrders.toArray()
  isLoading.value = false
}

const calculateOrderProgress = (order: InspectionOrder): number => {
  const totalPlanned = order.items.reduce((sum, i) => sum + i.plannedQty, 0)
  const totalReceived = order.items.reduce((sum, i) => sum + i.receivedQty, 0)
  if (totalPlanned === 0) return 0
  return Math.min(100, Math.round((totalReceived / totalPlanned) * 100))
}

const statusBadgeClasses = (status: InspectionStatus) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800'
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

const statusLabel = (status: InspectionStatus) => {
  switch (status) {
    case 'COMPLETED': return 'Hoàn thành'
    case 'IN_PROGRESS': return 'Đang kiểm'
    case 'PENDING': return 'Chờ kiểm'
  }
}

onMounted(() => {
  loadOrders()
})
</script>
