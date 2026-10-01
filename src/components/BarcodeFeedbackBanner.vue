<template>
  <transition
    enter-active-class="transform transition ease-out duration-200"
    enter-from-class="-translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="feedback" 
      @click="$emit('dismiss')"
      :class="bannerClasses"
      class="mx-3 my-2 p-3.5 rounded-xl shadow-lg border flex items-start gap-3 cursor-pointer select-none transition-all active:scale-[0.99]"
    >
      <div class="p-1 rounded-full shrink-0" :class="iconBgClasses">
        <CheckCircle2 v-if="feedback.type === 'SUCCESS'" class="w-6 h-6 text-white" />
        <AlertTriangle v-else-if="feedback.type === 'WARNING'" class="w-6 h-6 text-white" />
        <XCircle v-else class="w-6 h-6 text-white" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-sm tracking-tight truncate leading-tight">{{ feedback.title }}</h4>
          <span class="text-[10px] font-mono opacity-80 shrink-0 ml-1 bg-black/10 px-1.5 py-0.5 rounded">
            {{ feedback.barcode }}
          </span>
        </div>
        <p class="text-xs mt-0.5 opacity-95 leading-snug">{{ feedback.message }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-vue-next'
import type { ScanResultFeedback } from '../types'

const props = defineProps<{
  feedback: ScanResultFeedback | null
}>()

defineEmits(['dismiss'])

const bannerClasses = computed(() => {
  if (!props.feedback) return ''
  switch (props.feedback.type) {
    case 'SUCCESS':
      return 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-300/50'
    case 'WARNING':
      return 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-300/50'
    case 'ERROR':
    default:
      return 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-300/50 animate-shake'
  }
})

const iconBgClasses = computed(() => {
  if (!props.feedback) return ''
  switch (props.feedback.type) {
    case 'SUCCESS':
      return 'bg-emerald-700/80'
    case 'WARNING':
      return 'bg-amber-600/80 text-white'
    case 'ERROR':
    default:
      return 'bg-rose-700/80'
  }
})
</script>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.35s ease-in-out;
}
</style>
