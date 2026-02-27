<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useCalendarStore } from '@/stores/calendar'
import { ArrowRightEndOnRectangleIcon, CalendarDaysIcon, ClockIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { requestAccessToken } from '@/services/gsiService'

const authStore = useAuthStore()
const calendarStore = useCalendarStore()

function handleLogin(isAddAnother = false) {
  if (isAddAnother) {
    requestAccessToken({ prompt: 'select_account' }).catch((error: any) => {
      console.error('Failed to add account:', error)
    })
    return
  }

  requestAccessToken().catch((error: any) => {
    console.error('Failed to request access token:', error)
  })
}

function setActiveAccount(accountId: string) {
  authStore.activeAccountId = accountId
  authStore.fetchUpcomingEvents()
  localStorage.setItem('active_google_account_id', accountId)
}
</script>

<template>
  <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
    <div class="flex flex-col space-y-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700">
          <div class="flex items-center">
            <ClockIcon class="mr-3 h-5 w-5 text-blue-400" />
            <span>24-uurs Formaat</span>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat" />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700">
          <div class="flex items-center">
            <CalendarDaysIcon class="mr-3 h-5 w-5 text-green-400" />
            <span>Totaal Aantal Verlofdagen</span>
          </div>
          <input
            v-model.number="calendarStore.totalLeaveDays"
            type="number"
            class="w-20 rounded-md border p-1 text-center dark:border-gray-600 dark:bg-gray-900"
          />
        </div>
      </div>

      <div class="border-t pt-6 dark:border-gray-700">
        <h4 class="mb-3 text-lg font-semibold">Verbonden Accounts</h4>
        <div v-if="authStore.accounts.length > 0" class="mb-4 space-y-3">
          <div
            v-for="account in authStore.accounts"
            :key="account.id"
            :class="[
              'flex items-center justify-between rounded-md border p-3',
              authStore.activeAccountId === account.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
            ]"
          >
            <div class="flex truncate items-center">
              <span
                :class="[
                  'mr-3 h-4 w-4 shrink-0 rounded-full',
                  account.color.split(' ')[0],
                  account.color.split(' ')[1],
                  account.color.split(' ')[2].replace('border', 'bg')
                ]"
              ></span>
              <span class="truncate text-sm">{{ account.user?.email }}</span>
            </div>
            <div class="flex shrink-0 space-x-2">
              <button
                v-if="authStore.activeAccountId !== account.id"
                class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
                @click="setActiveAccount(account.id)"
              >
                Actief Instellen
              </button>
              <button
                class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                @click="authStore.removeAccount(account.id)"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>

        <button
          class="flex w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          @click="handleLogin(true)"
        >
          <PlusIcon class="mr-2 h-5 w-5" />
          Nog een Account Toevoegen
        </button>

        <div class="mt-4 border-t pt-4 dark:border-gray-700">
          <div v-if="authStore.accounts.length > 0" class="text-center">
            <button
              class="mx-auto flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              @click="authStore.clearAuth()"
            >
              <ArrowRightEndOnRectangleIcon class="mr-2 h-5 w-5" />
              Alle Accounts Uitloggen
            </button>
          </div>
          <div v-else class="text-center">
            <button
              class="mx-auto flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              @click="handleLogin(false)"
            >
              Inloggen met Google
            </button>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-300">
              Je moet inloggen om je Google Calendar te verbinden.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="h-full pt-0 md:border-l md:pl-8 dark:border-gray-700">
      <h4 class="mb-3 text-lg font-semibold">Zichtbaarheid Evenemententypes</h4>
      <div class="max-h-96 space-y-2 overflow-y-auto pr-2">
        <div
          v-for="eventType in calendarStore.eventTypes"
          :key="eventType.name"
          class="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700"
        >
          <div class="flex items-center">
            <span class="mr-3 h-3 w-3 rounded-full" :style="{ backgroundColor: eventType.color }"></span>
            <span>{{ eventType.name }}</span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="!calendarStore.hiddenEventTypes.has(eventType.name)"
              @change="calendarStore.toggleEventTypeVisibility(eventType.name)"
            />
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
  inset: 0;
  background-color: #ccc;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196f3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
