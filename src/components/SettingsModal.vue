<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useCalendarStore } from '@/stores/calendar'
import { XMarkIcon, ClockIcon, CalendarDaysIcon, ArrowRightEndOnRectangleIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { requestAccessToken } from '@/services/gsiService';

const authStore = useAuthStore()
const calendarStore = useCalendarStore()

const emit = defineEmits(['close'])

function handleLogin(isAddAnother: boolean = false) {
  if (isAddAnother) {
    requestAccessToken({ prompt: 'select_account' }).catch((error: any) => {
      console.error('Failed to add account:', error)
    });
  } else {
    requestAccessToken().catch((error: any) => {
      console.error('Failed to request access token:', error)
    });
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
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
    <div class="relative p-6 border shadow-lg rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white max-w-4xl w-full">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-semibold">Instellingen</h3>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left Column -->
        <div class="flex flex-col space-y-6">
          <!-- General Settings -->
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700">
              <div class="flex items-center">
                <ClockIcon class="h-5 w-5 mr-3 text-blue-400" />
                <span>24-uurs Formaat</span>
              </div>
              <label class="switch">
                <input type="checkbox" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat" />
                <span class="slider round"></span>
              </label>
            </div>

            <div class="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700">
              <div class="flex items-center">
                <CalendarDaysIcon class="h-5 w-5 mr-3 text-green-400" />
                <span>Totaal Aantal Verlofdagen</span>
              </div>
              <input
                type="number"
                class="w-20 p-1 border rounded-md text-center dark:bg-gray-900 dark:border-gray-600"
                v-model.number="calendarStore.totalLeaveDays"
              />
            </div>
          </div>

          <!-- Connected Accounts Section -->
          <div class="pt-6 border-t dark:border-gray-700">
            <h4 class="text-lg font-semibold mb-3">Verbonden Accounts</h4>
            <div v-if="authStore.accounts.length > 0" class="space-y-3 mb-4">
              <div v-for="account in authStore.accounts" :key="account.id"
                   :class="['flex items-center justify-between p-3 rounded-md border', authStore.activeAccountId === account.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600']">
                <div class="flex items-center truncate">
                  <span :class="['w-4 h-4 rounded-full mr-3 shrink-0', account.color.split(' ')[0], account.color.split(' ')[1], account.color.split(' ')[2].replace('border', 'bg')]"></span>
                  <span class="text-sm truncate">{{ account.user?.email }}</span>
                </div>
                <div class="flex space-x-2 shrink-0">
                  <button v-if="authStore.activeAccountId !== account.id" @click="setActiveAccount(account.id)" class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Actief Instellen</button>
                  <button @click="authStore.removeAccount(account.id)" class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Verwijderen</button>
                </div>
              </div>
            </div>
            <button @click="handleLogin(true)" class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center">
              <PlusIcon class="h-5 w-5 mr-2" /> Nog een Account Toevoegen
            </button>
            <!-- Login/Logout Section -->
            <div class="pt-4 mt-4 border-t dark:border-gray-700">
              <div v-if="authStore.accounts.length > 0" class="text-center">
                <button @click="authStore.clearAuth()" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center mx-auto">
                  <ArrowRightEndOnRectangleIcon class="h-5 w-5 mr-2" /> Alle Accounts Uitloggen
                </button>
              </div>
              <div v-else class="text-center">
                <button @click="handleLogin(false)" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center mx-auto">
                  Inloggen met Google
                </button>
                 <p class="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  Je moet inloggen om je Google Calendar te verbinden.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="pt-0 md:pt-0 md:border-l md:pl-8 dark:border-gray-700 h-full">
          <h4 class="text-lg font-semibold mb-3">Zichtbaarheid Evenemententypes</h4>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div v-for="eventType in calendarStore.eventTypes" :key="eventType.name"
                 class="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700">
              <div class="flex items-center">
                <span class="w-3 h-3 rounded-full mr-3" :style="{ backgroundColor: eventType.color }"></span>
                <span>{{ eventType.name }}</span>
              </div>
              <label class="switch">
                <input type="checkbox" :checked="!calendarStore.hiddenEventTypes.has(eventType.name)" @change="calendarStore.toggleEventTypeVisibility(eventType.name)" />
                <span class="slider round"></span>
              </label>
            </div>
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
  flex-shrink: 0;
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
