<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginComponent from './LoginComponent.vue'

const authStore = useAuthStore()
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>

<template>
  <header class="bg-blue-600 dark:bg-blue-800 text-white shadow-md">
    <nav class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo/App Name -->
      <RouterLink to="/" class="text-2xl font-bold">Agenda Add</RouterLink>

      <!-- Mobile Menu Button (Hamburger) -->
      <div class="md:hidden">
        <button @click="toggleMobileMenu" class="focus:outline-none">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-4 6h4"></path>
          </svg>
        </button>
      </div>

      <!-- Desktop Navigation and User Info -->
      <div class="hidden md:flex items-center space-x-6">
        <RouterLink to="/" class="hover:text-blue-200">Home</RouterLink>
        <RouterLink to="/settings" class="hover:text-blue-200">Settings</RouterLink>
        <div class="relative">
          <div v-if="authStore.isLoggedIn && authStore.user" class="flex items-center space-x-2">
            <span class="text-sm">{{ authStore.user.email || authStore.user.name }}</span>
            <button @click="authStore.clearAuth()" class="px-3 py-1 bg-blue-700 dark:bg-blue-900 rounded-md hover:bg-blue-500 dark:hover:bg-blue-700">
              Logout
            </button>
          </div>
          <div v-else>
            <LoginComponent />
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Menu Overlay -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-blue-700 dark:bg-blue-900 p-4">
      <div class="flex flex-col space-y-3">
        <RouterLink to="/" class="block hover:text-blue-200" @click="toggleMobileMenu">Home</RouterLink>
        <RouterLink to="/settings" class="block hover:text-blue-200" @click="toggleMobileMenu">Settings</RouterLink>
        <div v-if="authStore.isLoggedIn && authStore.user" class="flex flex-col space-y-2 pt-2 border-t border-blue-600 dark:border-blue-800">
          <span class="text-sm">{{ authStore.user.email || authStore.user.name }}</span>
          <button @click="authStore.clearAuth(); toggleMobileMenu();" class="px-3 py-1 bg-blue-600 dark:bg-blue-800 rounded-md hover:bg-blue-500 dark:hover:bg-blue-700 text-left">
            Logout
          </button>
        </div>
        <div v-else class="pt-2 border-t border-blue-600 dark:border-blue-800">
          <LoginComponent />
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* No specific scoped styles needed, Tailwind handles most */
</style>
