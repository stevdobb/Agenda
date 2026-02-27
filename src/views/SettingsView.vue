<script setup lang="ts">
import { useRouter } from 'vue-router'
import TopMenu from '@/components/TopMenu.vue'
import SettingsContent from '@/components/SettingsContent.vue'

const router = useRouter()

function handleViewSwitch(view: string) {
  if (view === 'year') {
    router.push('/year')
    return
  }

  router.push('/agenda')
}
</script>

<template>
  <div class="year-weather-theme">
    <div class="page-container mx-auto max-w-7xl px-4 pb-4 pt-28 sm:px-6 sm:pb-6 sm:pt-32 lg:px-8 lg:pb-8 lg:pt-32">
      <TopMenu
        currentView="list"
        :showSettings="false"
        :showRefresh="false"
        @update:view="handleViewSwitch"
      />

      <div class="settings-panel rounded-lg border p-4 sm:p-6">
        <h1 class="mb-6 text-2xl font-semibold text-card-foreground sm:text-3xl">Instellingen</h1>
        <SettingsContent />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 30px hsl(218 72% 20% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.18);
}
</style>
