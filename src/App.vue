<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import HeaderMenu from './components/HeaderMenu.vue' // Import HeaderMenu

const authStore = useAuthStore()

onMounted(() => {
  authStore.checkAuth()
  authStore.checkDarkMode()
})
</script>

<template>
  <div class="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col">
    <HeaderMenu />
    <main class="flex-grow">
      <RouterView />
    </main>
    <InstallButton class="fixed bottom-4 right-4"/>
  </div>
</template>
