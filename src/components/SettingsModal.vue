<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'
import SettingsContent from '@/components/SettingsContent.vue'

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
    <div class="relative max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-md border bg-white p-6 text-gray-900 shadow-lg dark:bg-gray-800 dark:text-white">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-semibold">Instellingen</h3>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
      <SettingsContent />
    </div>
  </div>
</template>
