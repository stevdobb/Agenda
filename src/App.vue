<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { initializeGsi } from './services/gsiService'
import AlertModal from '@/components/AlertModal.vue'
import { useUiStore } from './stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()

onMounted(() => {
  initializeGsi();
  authStore.checkAuth()
  authStore.checkDarkMode()
})
</script>

<template>
  <div class="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col">

    <main class="flex-grow">
      <RouterView />
    </main>
    <InstallButton class="fixed bottom-4 right-4"/>
    <AlertModal
      v-if="uiStore.isAlertVisible"
      :title="uiStore.alertTitle"
      :description="uiStore.alertDescription"
      @ok="uiStore.hideAlert()"
    />
  </div>
</template>
