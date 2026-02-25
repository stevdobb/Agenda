<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Ensure dark mode and 24-hour format are initialized on component mount
authStore.checkDarkMode()
authStore.checkAuth()
</script>

<template>
  <div class="year-weather-theme page-container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
    <h1 class="mb-6 text-3xl font-bold text-card-foreground">Settings</h1>

    <div class="settings-panel mb-6 rounded-lg border p-4">
      <h2 class="mb-4 text-2xl font-semibold text-card-foreground">Appearance</h2>
      <div class="flex items-center justify-between">
        <label for="darkModeToggle" class="text-lg text-card-foreground">Dark Mode</label>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="darkModeToggle" class="sr-only peer" :checked="authStore.isDarkMode" @change="authStore.toggleDarkMode()">
          <div class="h-6 w-11 rounded-full bg-secondary peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/40 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-['']"></div>
        </label>
      </div>
    </div>

    <div class="settings-panel mb-6 rounded-lg border p-4">
      <h2 class="mb-4 text-2xl font-semibold text-card-foreground">Time Format</h2>
      <div class="flex items-center justify-between">
        <label for="timeFormatToggle" class="text-lg text-card-foreground">Use 24-hour format</label>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="timeFormatToggle" class="sr-only peer" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat()">
          <div class="h-6 w-11 rounded-full bg-secondary peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/40 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-['']"></div>
        </label>
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
