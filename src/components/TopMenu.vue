<script setup lang="ts">
import { Cog6ToothIcon, ArrowPathIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'

defineProps<{
  currentView: string
  showRefresh?: boolean
  showSettings?: boolean
}>()

const emit = defineEmits(['update:view', 'refresh', 'openSettings'])
</script>

<template>
  <div class="relative my-8 text-center no-print">
    <!-- Settings Button -->
    <Button
      v-if="showSettings"
      variant="secondary"
      size="icon"
      @click="$emit('openSettings')"
      class="absolute right-0 top-0 border border-border/70"
      aria-label="Open instellingen"
    >
      <Cog6ToothIcon class="h-6 w-6" />
    </Button>

    <!-- View Switcher -->
    <div class="mb-4 mt-5 flex flex-wrap justify-center gap-2">
      <Button @click="$emit('update:view', 'year')" size="sm" :variant="currentView === 'year' ? 'default' : 'secondary'" class="min-w-[4.75rem] border border-border/70">
        Year
      </Button>
      <Button @click="$emit('update:view', 'list')" size="sm" :variant="currentView === 'list' ? 'default' : 'secondary'" class="min-w-[4.75rem] border border-border/70">
        List
      </Button>
      <Button @click="$emit('update:view', 'week')" size="sm" :variant="currentView === 'week' ? 'default' : 'secondary'" class="min-w-[4.75rem] border border-border/70">
        Week
      </Button>
      <Button @click="$emit('update:view', 'month')" size="sm" :variant="currentView === 'month' ? 'default' : 'secondary'" class="min-w-[4.75rem] border border-border/70">
        Month
      </Button>

      <Button v-if="showRefresh" @click="$emit('refresh')" variant="outline" size="icon" class="border-border/80" aria-label="Refresh Events">
        <ArrowPathIcon class="h-5 w-5" />
      </Button>
    </div>
  </div>
</template>
