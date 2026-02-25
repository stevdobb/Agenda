<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  currentDate: Date,
  events: any[],
  is24HourFormat: boolean
}>()

const emit = defineEmits(['update:currentDate', 'dayClicked'])


// Helper to format date and time
function formatEventTime(dateTime: string) {
  if (!dateTime) return 'All day';
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
    const eventDateStr = (event.start.date || event.start.dateTime).split('T')[0];
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
  return props.currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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
      <Button @click="goToToday" class="month-today-button">Today</Button>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div v-for="dayName in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="dayName" class="pb-2 text-center text-sm font-bold text-muted-foreground">
        {{ dayName }}
      </div>
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'day-cell relative h-32 overflow-hidden rounded-md border p-1',
          day ? 'cursor-pointer border-border/70' : 'day-cell-empty border-border/50',
          isToday(day) ? 'day-cell-today border-primary/70' : ''
        ]"
        @click="day && emit('dayClicked', day)"
      >
        <div v-if="day" class="text-right text-xs font-semibold" :class="isToday(day) ? 'text-primary' : 'text-card-foreground'">
          {{ day.getDate() }}
        </div>
        <div v-if="day && filteredEventsByMonth[day.toISOString().split('T')[0]]" class="space-y-0.5 text-xs">
          <p v-for="event in filteredEventsByMonth[day.toISOString().split('T')[0]]" :key="event.id"
             class="month-event-chip truncate rounded-sm px-1 py-0.5 text-card-foreground"
          >
            {{ formatEventTime(event.start.dateTime) }} {{ event.summary }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-cell {
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
</style>
