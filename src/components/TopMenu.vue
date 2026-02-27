<script setup lang="ts">
import { ref } from 'vue'
import { CalendarDays, CalendarRange, LayoutGrid, List, Menu, RefreshCcw, Settings2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps<{
  currentView: string
  showRefresh?: boolean
  showSettings?: boolean
}>()

const emit = defineEmits(['update:view', 'refresh', 'openSettings'])
const mobileMenuOpen = ref(false)

const viewItems = [
  { key: 'year', label: 'Year', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'week', label: 'Week', icon: CalendarRange },
  { key: 'month', label: 'Month', icon: CalendarDays },
]

function selectView(viewKey: string) {
  emit('update:view', viewKey)
  mobileMenuOpen.value = false
}

function triggerRefresh() {
  emit('refresh')
  mobileMenuOpen.value = false
}

function triggerSettings() {
  emit('openSettings')
  mobileMenuOpen.value = false
}
</script>

<template>
  <nav class="no-print fixed inset-x-0 top-0 z-50">
    <Card class="top-navbar relative z-50 w-full rounded-none border-0 shadow-none">
      <CardContent class="px-0 py-2 sm:py-3">
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center justify-between gap-2 py-1 text-card-foreground">
            <div class="flex items-center gap-2">
              <span class="top-navbar-logo inline-flex h-8 w-8 items-center justify-center rounded-md">
                <img src="/pwa-192x192.png" alt="" class="top-navbar-logo-image h-4 w-4" />
              </span>
              <span class="text-sm font-semibold tracking-wide">Natural Agenda</span>
            </div>

            <Button
              size="icon"
              variant="secondary"
              class="md:hidden border border-border/70"
              :aria-label="mobileMenuOpen ? 'Menu sluiten' : 'Menu openen'"
              :aria-expanded="mobileMenuOpen"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <X v-if="mobileMenuOpen" class="h-4 w-4" />
              <Menu v-else class="h-4 w-4" />
            </Button>
          </div>

          <div class="hidden items-center justify-center gap-2 md:flex">
            <Button
              v-for="item in viewItems"
              :key="item.key"
              size="sm"
              :variant="props.currentView === item.key ? 'default' : 'secondary'"
              class="min-w-[5.5rem] border border-border/70"
              @click="emit('update:view', item.key)"
            >
              <component :is="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </Button>
          </div>

          <div class="hidden items-center justify-end gap-2 px-1 md:flex">
            <Button v-if="props.showRefresh" @click="emit('refresh')" variant="outline" size="icon" class="border-border/80" aria-label="Refresh Events">
              <RefreshCcw class="h-4 w-4" />
            </Button>
            <Button v-if="props.showSettings" @click="emit('openSettings')" variant="outline" size="icon" class="border-border/80" aria-label="Open instellingen">
              <Settings2 class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="mobileMenuOpen" class="mobile-menu-panel md:hidden">
            <div class="grid grid-cols-2 gap-2">
              <Button
                v-for="item in viewItems"
                :key="`mobile-${item.key}`"
                size="sm"
                :variant="props.currentView === item.key ? 'default' : 'secondary'"
                class="justify-start border border-border/70"
                @click="selectView(item.key)"
              >
                <component :is="item.icon" class="h-4 w-4" />
                {{ item.label }}
              </Button>
            </div>

            <div v-if="props.showRefresh || props.showSettings" class="mt-3 flex items-center gap-2">
              <Button v-if="props.showRefresh" @click="triggerRefresh" variant="outline" class="flex-1 border-border/80">
                <RefreshCcw class="h-4 w-4" />
                Refresh
              </Button>
              <Button v-if="props.showSettings" @click="triggerSettings" variant="outline" class="flex-1 border-border/80">
                <Settings2 class="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </transition>
      </CardContent>
    </Card>

    <button
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-40 bg-black/20 md:hidden"
      aria-label="Sluit menu"
      @click="mobileMenuOpen = false"
    />
  </nav>
</template>

<style scoped>
.top-navbar {
  background:
    radial-gradient(circle at 12% 25%, hsl(var(--primary) / 0.22), transparent 38%),
    linear-gradient(160deg, hsl(214 72% 31% / 0.92) 0%, hsl(216 66% 27% / 0.9) 100%);
  box-shadow: 0 8px 24px hsl(218 65% 14% / 0.28);
  border-bottom: 1px solid hsl(var(--border) / 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.mobile-menu-panel {
  margin-top: 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--border) / 0.55);
  background: hsl(var(--card) / 0.92);
  padding: 0.75rem;
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.16);
}

.top-navbar-logo {
  border: 1px solid hsl(var(--border) / 0.65);
  background: hsl(var(--background) / 0.3);
}

.top-navbar-logo-image {
  border-radius: 0.2rem;
}
</style>
