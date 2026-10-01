<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans max-w-lg mx-auto shadow-2xl relative">
    <!-- Navbar Header -->
    <Navbar @open-simulate-scan="isSimulateModalOpen = true" />

    <!-- Main Content Area -->
    <main class="flex-1 p-3 overflow-y-auto">
      <router-view />
    </main>

    <!-- Bottom Navigation Bar for PDA -->
    <BottomNav />

    <!-- Barcode Simulation Modal (For testing without hardware scanner) -->
    <SimulateScanModal 
      :is-open="isSimulateModalOpen" 
      @close="isSimulateModalOpen = false" 
      @scan="handleGlobalBarcodeScanned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import BottomNav from './components/BottomNav.vue'
import SimulateScanModal from './components/SimulateScanModal.vue'
import { useBarcodeScanner } from './composables/useBarcodeScanner'
import { useCartonStore } from './stores/cartonStore'
import { usePutawayStore } from './stores/putawayStore'
import { initSampleData } from './database/db'

const router = useRouter()
const route = useRoute()
const cartonStore = useCartonStore()
const putawayStore = usePutawayStore()

const isSimulateModalOpen = ref(false)

// Global barcode routing based on current view and barcode pattern
const handleGlobalBarcodeScanned = async (barcode: string) => {
  const clean = barcode.trim().toUpperCase()
  const currentPath = route.path

  if (currentPath === '/receiving') {
    if (clean.startsWith('TH-') || !cartonStore.activeCarton) {
      await cartonStore.activateCarton(clean)
    } else {
      await cartonStore.scanChildItem(clean)
    }
  } else if (currentPath === '/putaway') {
    if (clean.startsWith('LOC-')) {
      await putawayStore.setLocation(clean)
    } else if (putawayStore.putawayMode === 'CARTON' || clean.startsWith('TH-')) {
      await putawayStore.putawayCarton(clean)
    } else {
      await putawayStore.putawaySingleItem(clean)
    }
  } else if (currentPath === '/lookup') {
    // If on lookup, trigger search by re-navigating with query or handled locally
    router.replace({ path: '/lookup', query: { q: clean, t: Date.now() } })
  } else {
    // Default: switch to receiving
    router.push('/receiving')
    if (clean.startsWith('TH-')) {
      await cartonStore.activateCarton(clean)
    }
  }
}

// Intercept hardware scanner keystrokes globally
useBarcodeScanner({
  minChars: 3,
  maxCharIntervalMs: 50,
  onScan: (barcode) => {
    handleGlobalBarcodeScanned(barcode)
  }
})

onMounted(async () => {
  await initSampleData()
})
</script>
