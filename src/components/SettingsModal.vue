<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { XMarkIcon, SunIcon, MoonIcon, ClockIcon } from '@heroicons/vue/24/solid'

const authStore = useAuthStore()

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
    <div class="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold">Settings</h3>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Dark Mode Toggle -->
        <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center">
            <MoonIcon v-if="authStore.isDarkMode" class="h-5 w-5 mr-2 text-yellow-400" />
            <SunIcon v-else class="h-5 w-5 mr-2 text-orange-400" />
            <span>Dark Mode</span>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="authStore.isDarkMode" @change="authStore.toggleDarkMode" />
            <span class="slider round"></span>
          </label>
        </div>

        <!-- 24-hour Format Toggle -->
        <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center">
            <ClockIcon class="h-5 w-5 mr-2 text-blue-400" />
            <span>24-hour Format</span>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat" />
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
}
input:checked + .slider {
  background-color: #2196F3;
}
input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}
input:checked + .slider:before {
  transform: translateX(20px);
}
/* Rounded sliders */
.slider.round {
  border-radius: 20px;
}
.slider.round:before {
  border-radius: 50%;
}
</style>
