<script setup lang="ts">
import { defineProps, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { Repeat2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  currentDate: Date,
  events: any[],
  is24HourFormat: boolean
}>()

const { t, locale } = useI18n()

const emit = defineEmits(['update:currentDate', 'dayClicked', 'eventClicked', 'eventMoved'])

const draggedEvent = ref<any>(null)
const dragOverDate = ref<string | null>(null)

function onDragStart(event: DragEvent, calEvent: any) {
  draggedEvent.value = calEvent
  event.dataTransfer?.setData('text/plain', calEvent.id)
}

function onDragOver(event: DragEvent, day: Date) {
  event.preventDefault()
  dragOverDate.value = toLocalDateKey(day)
}

function onDragLeave() {
  dragOverDate.value = null
}

function onDrop(event: DragEvent, day: Date) {
  event.preventDefault()
  dragOverDate.value = null
  if (!draggedEvent.value) return
  emit('eventMoved', draggedEvent.value, day)
  draggedEvent.value = null
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEventDateKey(event: any) {
  if (event.start.date) {
    return event.start.date
  }

  if (event.start.dateTime) {
    return toLocalDateKey(new Date(event.start.dateTime))
  }

  return ''
}


// Helper to format date and time
function formatEventTime(dateTime: string) {
  if (!dateTime) return t('all_day');
  return new Date(dateTime).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !props.is24HourFormat,
  });
}

const startOfMonth = computed(() => {
  const date = new Date(props.currentDate);
  date.setDate(1);
  return date;
})

const daysInMonth = computed(() => {
  const date = new Date(startOfMonth.value);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.getDate();
})

const firstDayOfMonth = computed(() => {
  return startOfMonth.value.getDay(); // 0 for Sunday, 1 for Monday
})

const calendarDays = computed(() => {
  const days = [];
  const numDays = daysInMonth.value;
  const firstDay = firstDayOfMonth.value;

  // Fill leading empty days
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Fill days of the month
  for (let i = 1; i <= numDays; i++) {
    const date = new Date(startOfMonth.value);
    date.setDate(i);
    days.push(date);
  }

  return days;
})

const filteredEventsByMonth = computed(() => {
  const monthEvents: { [key: string]: any[] } = {};
  props.events.forEach(event => {
    const eventDateStr = getEventDateKey(event);
    if (!eventDateStr) return;
    if (!monthEvents[eventDateStr]) {
      monthEvents[eventDateStr] = [];
    }
    monthEvents[eventDateStr].push(event);
  });

  // Sort events within each day
  for (const dateKey in monthEvents) {
    monthEvents[dateKey].sort((a, b) => {
      const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
      const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
      return timeA - timeB;
    });
  }
  return monthEvents;
})

const currentMonthYear = computed(() => {
  return props.currentDate.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' });
})

const weekdayLabels = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  // Week starting Sunday: 0=Sun, 1=Mon, ..., 6=Sat
  return [0, 1, 2, 3, 4, 5, 6].map(d => {
    const date = new Date(2024, 0, d + 7) // Jan 7=Sun, 8=Mon, ..., 13=Sat
    return fmt.format(date)
  })
})

function navigateMonth(direction: 'prev' | 'next') {
  const newDate = new Date(props.currentDate);
  if (direction === 'prev') {
    newDate.setMonth(newDate.getMonth() - 1);
  } else {
    newDate.setMonth(newDate.getMonth() + 1);
  }
  emit('update:currentDate', newDate);
}

function goToToday() {
  emit('update:currentDate', new Date());
}

function isToday(date: Date | null) {
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function getEventRenderKey(event: any) {
  const accountId = event.accountId ?? 'no-account'
  const calendarId = event.calendarId ?? 'primary'
  return `${accountId}:${calendarId}:${event.id}`
}
</script>

<template>
  <div class="month-view mt-8 border-t border-border/70 pt-6">
    <!-- Month Navigation -->
    <div class="mb-4 flex items-center justify-between">
      <Button @click="navigateMonth('prev')" variant="secondary" size="icon" class="border border-border/70">
        <ChevronLeftIcon class="h-5 w-5" />
      </Button>
      <h3 class="text-lg font-semibold text-card-foreground">{{ currentMonthYear }}</h3>
      <Button @click="navigateMonth('next')" variant="secondary" size="icon" class="border border-border/70">
        <ChevronRightIcon class="h-5 w-5" />
      </Button>
    </div>
    <div class="mb-4 flex justify-center">
      <Button @click="goToToday" class="month-today-button">{{ $t('today') }}</Button>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div v-for="dayName in weekdayLabels" :key="dayName" class="pb-2 text-center text-sm font-bold text-muted-foreground">
        {{ dayName }}
      </div>
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'day-cell relative rounded-md border p-1 transition-colors',
          day ? 'cursor-pointer border-border/70' : 'day-cell-empty border-border/50',
          isToday(day) ? 'day-cell-today border-primary/70' : '',
          day && dragOverDate === toLocalDateKey(day) ? 'day-cell-drag-over' : ''
        ]"
        @click="day && emit('dayClicked', day)"
        @dragover="day && onDragOver($event, day)"
        @dragleave="onDragLeave"
        @drop="day && onDrop($event, day)"
      >
        <div v-if="day" class="text-right text-xs font-semibold" :class="isToday(day) ? 'text-primary' : 'text-card-foreground'">
          {{ day.getDate() }}
        </div>
        <div v-if="day && filteredEventsByMonth[toLocalDateKey(day)]" class="space-y-0.5 text-xs">
          <p v-for="event in filteredEventsByMonth[toLocalDateKey(day)]" :key="getEventRenderKey(event)"
             class="month-event-chip flex cursor-grab items-center gap-0.5 rounded-sm py-0.5 pr-1 text-card-foreground transition hover:border-primary/70"
             draggable="true"
             @dragstart="onDragStart($event, event)"
             :style="event.calendarColor ? { borderLeftColor: event.calendarColor, borderLeftWidth: '3px', paddingLeft: '4px' } : { paddingLeft: '4px' }"
             @click.stop="emit('eventClicked', event)"
          >
            <span class="truncate">{{ formatEventTime(event.start.dateTime) }} {{ event.summary }}</span>
            <Repeat2 v-if="event.recurrence?.length || event.recurringEventId" class="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-cell {
  min-height: 8rem;
  background-color: hsl(var(--background) / 0.2);
}

.day-cell-empty {
  background-color: hsl(var(--secondary) / 0.38);
}

.day-cell-today {
  background-color: hsl(var(--primary) / 0.2);
}

.month-event-chip {
  border: 1px solid hsl(var(--border) / 0.55);
  background-color: hsl(var(--secondary) / 0.45);
}

.month-today-button {
  border: 1px solid hsl(var(--border) / 0.65);
}

.day-cell-drag-over {
  background-color: hsl(var(--primary) / 0.15);
  border-color: hsl(var(--primary) / 0.6) !important;
}
</style>
