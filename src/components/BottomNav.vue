<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-lg select-none pb-safe">
    <div class="grid grid-cols-5 h-16 max-w-lg mx-auto">
      <router-link 
        to="/receiving" 
        v-slot="{ isActive }" 
        class="flex flex-col items-center justify-center transition-colors"
      >
        <div :class="isActive ? 'text-blue-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'" class="flex flex-col items-center transition-all">
          <Box class="w-5 h-5 mb-0.5" />
          <span class="text-[10px] leading-tight">Nhận Thùng</span>
        </div>
      </router-link>

      <router-link 
        to="/cartons" 
        v-slot="{ isActive }" 
        class="flex flex-col items-center justify-center transition-colors"
      >
        <div :class="isActive ? 'text-blue-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'" class="flex flex-col items-center transition-all">
          <Package class="w-5 h-5 mb-0.5" />
          <span class="text-[10px] leading-tight">DS Thùng</span>
        </div>
      </router-link>

      <router-link 
        to="/putaway" 
        v-slot="{ isActive }" 
        class="flex flex-col items-center justify-center transition-colors"
      >
        <div :class="isActive ? 'text-blue-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'" class="flex flex-col items-center transition-all">
          <Warehouse class="w-5 h-5 mb-0.5" />
          <span class="text-[10px] leading-tight">Lên Kệ</span>
        </div>
      </router-link>

      <router-link 
        to="/lookup" 
        v-slot="{ isActive }" 
        class="flex flex-col items-center justify-center transition-colors"
      >
        <div :class="isActive ? 'text-blue-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'" class="flex flex-col items-center transition-all">
          <Search class="w-5 h-5 mb-0.5" />
          <span class="text-[10px] leading-tight">Tra Cứu</span>
        </div>
      </router-link>

      <router-link 
        to="/orders" 
        v-slot="{ isActive }" 
        class="flex flex-col items-center justify-center transition-colors"
      >
        <div :class="isActive ? 'text-blue-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-700'" class="flex flex-col items-center transition-all">
          <ClipboardList class="w-5 h-5 mb-0.5" />
          <span class="text-[10px] leading-tight">Phiếu GĐ</span>
        </div>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Box, Package, Warehouse, Search, ClipboardList } from 'lucide-vue-next'
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
