<script setup lang="ts">
import { Cog6ToothIcon, ArrowPathIcon } from '@heroicons/vue/24/solid'

defineProps<{
  currentView: string
  showRefresh?: boolean
  showSettings?: boolean
}>()

const emit = defineEmits(['update:view', 'refresh', 'openSettings'])
</script>

<template>
  <div class="relative text-center my-8 no-print">
    <!-- Settings Button -->
    <button v-if="showSettings" @click="$emit('openSettings')" class="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
      <Cog6ToothIcon class="h-6 w-6" />
    </button>

    <!-- View Switcher -->
    <div class="flex justify-center space-x-2 mb-4 mt-5">
      <button @click="$emit('update:view', 'year')" :class="{'bg-blue-500 text-white': currentView === 'year', 'bg-gray-200 dark:bg-gray-700': currentView !== 'year'}" class="px-3 py-1 rounded-md transition">Year</button>
      <button @click="$emit('update:view', 'list')" :class="{'bg-blue-500 text-white': currentView === 'list', 'bg-gray-200 dark:bg-gray-700': currentView !== 'list'}" class="px-3 py-1 rounded-md transition">List</button>
      <button @click="$emit('update:view', 'week')" :class="{'bg-blue-500 text-white': currentView === 'week', 'bg-gray-200 dark:bg-gray-700': currentView !== 'week'}" class="px-3 py-1 rounded-md transition">Week</button>
      <button @click="$emit('update:view', 'month')" :class="{'bg-blue-500 text-white': currentView === 'month', 'bg-gray-200 dark:bg-gray-700': currentView !== 'month'}" class="px-3 py-1 rounded-md transition">Month</button>
      
      
      <button v-if="showRefresh" @click="$emit('refresh')" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition" aria-label="Refresh Events">
        <ArrowPathIcon class="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  </div>
</template>