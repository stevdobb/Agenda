<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCalendarStore } from '@/stores/calendar'
import { ArrowRightEndOnRectangleIcon, CalendarDaysIcon, ClockIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { requestAccessToken } from '@/services/gsiService'

const authStore = useAuthStore()
const calendarStore = useCalendarStore()
const tokenRefreshBufferMs = 30 * 1000
const CALENDAR_VISIBILITY_STORAGE_KEY = 'visible_google_calendar_account_ids'
const visibleCalendarIds = ref<Set<string>>(new Set())
const showCalendarFilters = ref(false)

function getCalendarVisibilityKey(accountId: string, calendarId: string) {
  return `${accountId}::${calendarId}`
}

function readStoredVisibleCalendarIds() {
  const raw = localStorage.getItem(CALENDAR_VISIBILITY_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return null
  }
}

function persistVisibleCalendarIds() {
  localStorage.setItem(CALENDAR_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(visibleCalendarIds.value)))
}

function syncVisibleCalendarIdsWithAccounts() {
  const allCalendarKeys = authStore.accounts.flatMap((account) =>
    (account.calendars ?? []).map((calendar) => getCalendarVisibilityKey(account.id, calendar.id)),
  )

  if (allCalendarKeys.length === 0) {
    visibleCalendarIds.value = new Set()
    localStorage.removeItem(CALENDAR_VISIBILITY_STORAGE_KEY)
    return
  }

  const stored = readStoredVisibleCalendarIds()
  if (!stored) {
    visibleCalendarIds.value = new Set(allCalendarKeys)
    persistVisibleCalendarIds()
    return
  }

  const nextVisibleIds = new Set(allCalendarKeys.filter((key) => stored.has(key)))
  allCalendarKeys.forEach((key) => {
    if (!stored.has(key)) {
      nextVisibleIds.add(key)
    }
  })
  if (stored.size > 0 && nextVisibleIds.size === 0) {
    allCalendarKeys.forEach((key) => nextVisibleIds.add(key))
  }
  visibleCalendarIds.value = nextVisibleIds
  persistVisibleCalendarIds()
}

function isCalendarVisible(accountId: string, calendarId: string) {
  return visibleCalendarIds.value.has(getCalendarVisibilityKey(accountId, calendarId))
}

function toggleCalendarVisibility(accountId: string, calendarId: string) {
  const key = getCalendarVisibilityKey(accountId, calendarId)
  const next = new Set(visibleCalendarIds.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  visibleCalendarIds.value = next
  persistVisibleCalendarIds()
}

function showAllCalendars() {
  const allKeys = authStore.accounts.flatMap((account) =>
    (account.calendars ?? []).map((calendar) => getCalendarVisibilityKey(account.id, calendar.id)),
  )
  visibleCalendarIds.value = new Set(allKeys)
  persistVisibleCalendarIds()
}

function hideAllCalendars() {
  visibleCalendarIds.value = new Set()
  persistVisibleCalendarIds()
}

function getCalendarDotColor(accountId: string, calendarId: string, backgroundColor?: string) {
  if (backgroundColor) {
    return backgroundColor
  }

  const key = `${accountId}:${calendarId}`
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 70% 52%)`
}

const calendarFilters = computed(() =>
  authStore.accounts.flatMap((account) => {
    const accountLabel = account.user?.email ?? account.id
    return (account.calendars ?? []).map((calendar) => ({
      accountId: account.id,
      calendarId: calendar.id,
      accountLabel,
      calendarLabel: calendar.summary,
      dotColor: getCalendarDotColor(account.id, calendar.id, calendar.backgroundColor),
      isVisible: isCalendarVisible(account.id, calendar.id),
      isPrimary: Boolean(calendar.primary),
    }))
  }),
)

watch(
  () =>
    authStore.accounts
      .map((account) => `${account.id}:${(account.calendars ?? []).map((calendar) => calendar.id).join(',')}`)
      .join('|'),
  () => {
    syncVisibleCalendarIdsWithAccounts()
  },
  { immediate: true },
)

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

async function setActiveAccount(accountId: string) {
  authStore.activeAccountId = accountId
  const selectedAccount = authStore.accounts.find((account) => account.id === accountId)

  if (selectedAccount && selectedAccount.expiresAt <= Date.now() + tokenRefreshBufferMs) {
    await requestAccessToken({
      prompt: '',
      hint: selectedAccount.user?.email,
    }).catch((error: any) => {
      console.error('Failed to refresh token for selected account:', error)
    })
  }

  await authStore.fetchUpcomingEvents()
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
        <template v-if="authStore.isLoggedIn">
          <div class="mb-4 space-y-3">
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

          <div class="mt-4 border-t pt-4 dark:border-gray-700 text-center">
            <button
              class="mx-auto flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              @click="authStore.clearAuth()"
            >
              <ArrowRightEndOnRectangleIcon class="mr-2 h-5 w-5" />
              Alle Accounts Uitloggen
            </button>
          </div>
        </template>

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

        <div v-if="calendarFilters.length > 1" class="mt-6 border-t pt-6 dark:border-gray-700">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-lg font-semibold">Kalenders Zichtbaarheid</h4>
            <button
              class="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              @click="showCalendarFilters = !showCalendarFilters"
            >
              {{ showCalendarFilters ? 'Verberg filters' : 'Toon filters' }}
            </button>
          </div>
          <div v-if="showCalendarFilters" class="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-sm text-muted-foreground">Kalenders beheren</div>
            <div class="flex items-center gap-2">
              <button
                class="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                @click="showAllCalendars"
              >
                Alles tonen
              </button>
              <button
                class="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                @click="hideAllCalendars"
              >
                Alles verbergen
              </button>
            </div>
          </div>
          <ul v-if="showCalendarFilters" class="calendar-filter-list space-y-2">
            <li
              v-for="calendar in calendarFilters"
              :key="`${calendar.accountId}:${calendar.calendarId}`"
              :class="[
                'calendar-filter-item flex flex-col items-start justify-between gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center',
                calendar.isVisible ? 'calendar-filter-item-active' : 'calendar-filter-item-inactive',
              ]"
            >
              <label class="flex w-full min-w-0 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  :checked="calendar.isVisible"
                  @change="toggleCalendarVisibility(calendar.accountId, calendar.calendarId)"
                  class="h-5 w-5 sm:h-4 sm:w-4"
                />
                <span class="calendar-dot h-3 w-3 rounded-full" :style="{ backgroundColor: calendar.dotColor }" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ calendar.calendarLabel }}</span>
                  <span class="block truncate text-xs text-muted-foreground">{{ calendar.accountLabel }}</span>
                </span>
              </label>
              <span v-if="calendar.isPrimary" class="calendar-primary-badge self-start rounded-full px-2 py-0.5 text-[10px] font-semibold sm:self-auto">
                Primary
              </span>
            </li>
          </ul>
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

.calendar-filter-list {
  max-height: 15rem;
  overflow: auto;
}

.calendar-filter-item-active {
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--primary) / 0.16);
}

.calendar-filter-item-inactive {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--background) / 0.2);
  color: hsl(var(--muted-foreground));
}

.calendar-dot {
  box-shadow: 0 0 0 1px hsl(var(--background) / 0.4), 0 0 0 2px hsl(var(--border) / 0.7);
}

.calendar-primary-badge {
  border: 1px solid hsl(var(--primary) / 0.45);
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--card-foreground));
}

@media (max-width: 640px) {
  .calendar-filter-list {
    max-height: 12rem;
  }
}
</style>
