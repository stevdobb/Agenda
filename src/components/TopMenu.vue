<script setup lang="ts">
import { CalendarCheck2, CalendarDays, CalendarRange, LayoutGrid, List, RefreshCcw, Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  currentView: string
  showRefresh?: boolean
  showSettings?: boolean
}>()

const emit = defineEmits(['update:view', 'refresh', 'openSettings'])

const viewItems = [
  { key: 'year', label: 'Year', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'week', label: 'Week', icon: CalendarRange },
  { key: 'month', label: 'Month', icon: CalendarDays },
]
</script>

<template>
  <nav class="no-print my-6">
    <Card class="top-navbar border border-border/70">
      <CardContent class="p-2 sm:p-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-2 px-2 py-1 text-card-foreground">
            <span class="top-navbar-logo inline-flex h-8 w-8 items-center justify-center rounded-md">
              <CalendarCheck2 class="h-4 w-4" />
            </span>
            <span class="text-sm font-semibold tracking-wide">Natural Agenda</span>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2">
            <Button
              v-for="item in viewItems"
              :key="item.key"
              size="sm"
              :variant="currentView === item.key ? 'default' : 'secondary'"
              class="min-w-[5.5rem] border border-border/70"
              @click="$emit('update:view', item.key)"
            >
              <component :is="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </Button>
          </div>

          <div class="flex items-center justify-end gap-2 px-1">
            <Button v-if="showRefresh" @click="$emit('refresh')" variant="outline" size="icon" class="border-border/80" aria-label="Refresh Events">
              <RefreshCcw class="h-4 w-4" />
            </Button>
            <Button v-if="showSettings" @click="$emit('openSettings')" variant="outline" size="icon" class="border-border/80" aria-label="Open instellingen">
              <Settings2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </nav>
</template>

<style scoped>
.top-navbar {
  background-color: hsl(var(--card) / 0.92);
  box-shadow: 0 12px 28px hsl(218 58% 18% / 0.24), inset 0 1px 0 hsl(0 0% 100% / 0.14);
}

.top-navbar-logo {
  border: 1px solid hsl(var(--border) / 0.65);
  background: hsl(var(--background) / 0.3);
  color: hsl(var(--primary));
}
</style>
