<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { XMarkIcon, SunIcon, MoonIcon, ClockIcon, ArrowRightEndOnRectangleIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { requestAccessToken } from '@/services/gsiService';

const authStore = useAuthStore()

const emit = defineEmits(['close'])

function handleLogin(isAddAnother: boolean = false) {
  if (isAddAnother) {
    requestAccessToken({ prompt: 'select_account' });
  } else {
    requestAccessToken();
  }
}

const setActiveAccount = (accountId: string) => {
  authStore.activeAccountId = accountId
  authStore.fetchUpcomingEvents()
  localStorage.setItem('active_google_account_id', accountId)
}

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

        <!-- Connected Accounts Section -->
        <div class="pt-4 border-t dark:border-gray-700">
          <h4 class="text-md font-semibold mb-2">Connected Accounts</h4>
          <div v-if="authStore.accounts.length > 0" class="space-y-2 mb-4">
            <div v-for="account in authStore.accounts" :key="account.id"
                 :class="['flex items-center justify-between p-2 rounded-md border', authStore.activeAccountId === account.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600']">
              <div class="flex items-center">
                <span :class="['w-4 h-4 rounded-full mr-2', account.color.split(' ')[0], account.color.split(' ')[1], account.color.split(' ')[2].replace('border', 'bg')]"></span>
                <span class="text-sm">{{ account.user?.email }}</span>
              </div>
              <div class="flex space-x-2">
                <button v-if="authStore.activeAccountId !== account.id" @click="setActiveAccount(account.id)" class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Set Active</button>
                <button @click="authStore.removeAccount(account.id)" class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Remove</button>
              </div>
            </div>
          </div>
          <button @click="handleLogin(true)" class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center">
            <PlusIcon class="h-5 w-5 mr-2" /> Add Another Account
          </button>
        </div>

        <!-- Login/Logout Section -->
        <div class="pt-4 border-t dark:border-gray-700">
          <div v-if="authStore.accounts.length > 0" class="text-center">
            <button @click="authStore.clearAuth()" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center mx-auto">
              <ArrowRightEndOnRectangleIcon class="h-5 w-5 mr-2" /> Logout All Accounts
            </button>
          </div>
          <div v-else class="text-center">
            <button @click="handleLogin(false)" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center mx-auto">
              Login with Google
            </button>
             <p class="text-sm text-gray-500 dark:text-gray-300 mt-2">
              You need to login to connect your Google Calendar.
            </p>
          </div>
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
