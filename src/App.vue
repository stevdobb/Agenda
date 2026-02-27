<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { initializeGsi } from './services/gsiService'
import AlertModal from '@/components/AlertModal.vue'
import { useUiStore } from './stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const weatherLayoutRouteNames = new Set(['year', 'agenda', 'settings'])
const isWeatherRoute = computed(() => {
  const currentName = typeof route.name === 'string' ? route.name : ''
  return weatherLayoutRouteNames.has(currentName)
})

onMounted(() => {
  initializeGsi();
  authStore.checkAuth()
  authStore.checkDarkMode()
})
</script>

<template>
  <div :class="['min-h-screen flex flex-col', isWeatherRoute ? 'year-route-bg' : 'bg-gray-100 dark:bg-gray-900']">

    <main class="flex-grow">
      <RouterView />
    </main>
    <AlertModal
      v-if="uiStore.isAlertVisible"
      :title="uiStore.alertTitle"
      :description="uiStore.alertDescription"
      @ok="uiStore.hideAlert()"
    />
  </div>
</template>

<style scoped>
.year-route-bg {
  background:
    radial-gradient(circle at 90% 9%, hsl(200 100% 82% / 0.2), transparent 30%),
    linear-gradient(165deg, hsl(213 70% 38%) 0%, hsl(214 67% 35%) 42%, hsl(216 64% 30%) 100%);
}
</style>
