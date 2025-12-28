<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Ensure dark mode and 24-hour format are initialized on component mount
authStore.checkDarkMode()
authStore.checkAuth()
</script>

<template>
  <div class="settings-page p-4 md:p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-screen">
    <h1 class="text-3xl font-bold mb-6">Settings</h1>

    <div class="setting-section mb-6 p-4 border rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700">
      <h2 class="text-2xl font-semibold mb-4">Appearance</h2>
      <div class="flex items-center justify-between">
        <label for="darkModeToggle" class="text-lg">Dark Mode</label>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="darkModeToggle" class="sr-only peer" :checked="authStore.isDarkMode" @change="authStore.toggleDarkMode()">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>

    <div class="setting-section mb-6 p-4 border rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700">
      <h2 class="text-2xl font-semibold mb-4">Time Format</h2>
      <div class="flex items-center justify-between">
        <label for="timeFormatToggle" class="text-lg">Use 24-hour format</label>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="timeFormatToggle" class="sr-only peer" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat()">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for the settings page here if needed */
</style>
