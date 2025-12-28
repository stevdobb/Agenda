<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.checkAuth()
})
</script>

<template>
  <div class="bg-gray-100 min-h-screen">
    <RouterView />
  </div>
</template>
