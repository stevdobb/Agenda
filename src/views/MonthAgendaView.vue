<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MonthView from '@/components/MonthView.vue'
import TopMenu from '@/components/TopMenu.vue'
import { Repeat2 } from 'lucide-vue-next'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const currentDate = ref(new Date())
const selectedDay = ref<Date>(new Date())
const eventListRef = ref<HTMLElement | null>(null)

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEventDateKey(event: any) {
  if (event.start?.date) return event.start.date
  if (event.start?.dateTime) return toLocalDateKey(new Date(event.start.dateTime))
  return ''
}

function formatEventTime(dateTime: string) {
  return new Date(dateTime).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !authStore.is24HourFormat,
  })
}

const eventsForSelectedDay = computed(() => {
  const key = toLocalDateKey(selectedDay.value)
  return authStore.upcomingEvents
    .filter(event => getEventDateKey(event) === key)
    .sort((a, b) => {
      const tA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0
      const tB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0
      return tA - tB
    })
})

const selectedDayLabel = computed(() => {
  return selectedDay.value.toLocaleDateString(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

function handleDayClick(date: Date) {
  selectedDay.value = date
  setTimeout(() => {
    eventListRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 50)
}

async function fetchEventsForMonth() {
  if (!authStore.isLoggedIn) return
  const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  await authStore.fetchUpcomingEvents(start, end)
}

watch(currentDate, fetchEventsForMonth)
onMounted(fetchEventsForMonth)

function handleViewSwitch(view: string) {
  if (view === 'month_agenda') return
  if (view === 'year') {
    router.push('/year')
  } else if (view === 'todos') {
    router.push('/todos')
  } else {
    router.push({ path: '/agenda', query: { view } })
  }
}
</script>

<template>
  <div class="year-weather-theme">
    <div class="page-container mx-auto max-w-7xl px-4 pt-20 pb-4 sm:px-6 sm:pt-24 sm:pb-6 lg:px-8 lg:pt-24 lg:pb-8">

      <TopMenu
        current-view="month_agenda"
        :show-settings="false"
        :show-refresh="false"
        @update:view="handleViewSwitch"
      />

      <div class="month-agenda-panel rounded-lg border p-6 sm:p-7">

        <!-- Calendar: compact cells, no events inside -->
        <div class="compact-month">
          <MonthView
            :current-date="currentDate"
            :events="authStore.upcomingEvents"
            :is24HourFormat="authStore.is24HourFormat"
            :selected-date="selectedDay"
            :show-event-count="true"
            @update:currentDate="currentDate = $event"
            @dayClicked="handleDayClick"
            @eventClicked="() => {}"
            @eventMoved="() => {}"
          />
        </div>

        <!-- Event list for selected day -->
        <div ref="eventListRef" class="mt-6 border-t border-border/70 pt-4">
          <h3 class="mb-3 text-base font-semibold text-card-foreground capitalize">
            {{ selectedDayLabel }}
          </h3>

          <p v-if="eventsForSelectedDay.length === 0" class="text-sm text-muted-foreground">
            {{ t('no_events') }}
          </p>

          <ul v-else class="space-y-1">
            <li
              v-for="event in eventsForSelectedDay"
              :key="`${event.accountId}:${event.calendarId}:${event.id}`"
              class="event-item flex items-center gap-3 rounded-md border p-2 text-sm"
              :style="event.calendarColor ? { borderLeftColor: event.calendarColor, borderLeftWidth: '3px' } : {}"
            >
              <span class="w-14 shrink-0 text-xs text-muted-foreground">
                {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : t('all_day') }}
              </span>
              <span class="flex-1 font-medium text-card-foreground">{{ event.summary }}</span>
              <Repeat2
                v-if="event.recurrence?.length || event.recurringEventId"
                class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              />
            </li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.year-weather-theme {
  min-height: 100vh;
  background-color: hsl(var(--background));
}

.month-agenda-panel {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 30px hsl(218 72% 20% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.18);
}

.compact-month :deep(.day-cell) {
  min-height: 2.75rem;
}

.event-item {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--background) / 0.2);
  transition: background-color 0.15s;
}

.event-item:hover {
  background-color: hsl(var(--background) / 0.35);
}
</style>
