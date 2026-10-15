<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import EventEditor from '@/components/EventEditor.vue'
import type { CalendarEvent } from '@/stores/calendar'

defineProps<{
  event: CalendarEvent
}>()

const emit = defineEmits(['close'])

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
    @click.self="emit('close')"
  >
    <div class="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto">
      <button
        @click="emit('close')"
        class="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        :aria-label="$t('close')"
      >
        <XMarkIcon class="h-5 w-5" />
      </button>
      <EventEditor :event="event" @saved="emit('close')" @cancel="emit('close')" />
    </div>
  </div>
</template>
