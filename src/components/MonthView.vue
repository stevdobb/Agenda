<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  currentDate: Date,
  events: any[],
  is24HourFormat: boolean
}>()

const emit = defineEmits(['update:currentDate'])


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
  <div class="mt-8 border-t dark:border-gray-700 pt-6">
    <!-- Month Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button @click="navigateMonth('prev')" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
        <ChevronLeftIcon class="h-5 w-5" />
      </button>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{ currentMonthYear }}</h3>
      <button @click="navigateMonth('next')" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
        <ChevronRightIcon class="h-5 w-5" />
      </button>
    </div>
    <div class="flex justify-center mb-4">
      <button @click="goToToday" class="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition">Today</button>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div v-for="dayName in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="dayName" class="text-center font-bold text-sm text-gray-600 dark:text-gray-300 pb-2">
        {{ dayName }}
      </div>
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'relative h-24 p-1 rounded-md overflow-hidden',
          day ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800',
          isToday(day) ? 'border-2 border-blue-500' : 'border border-gray-200 dark:border-gray-600'
        ]"
      >
        <div v-if="day" class="text-right text-xs font-semibold" :class="isToday(day) ? 'text-blue-500' : 'text-gray-800 dark:text-white'">
          {{ day.getDate() }}
        </div>
        <div v-if="day && filteredEventsByMonth[day.toISOString().split('T')[0]]" class="space-y-0.5 text-xs">
          <p v-for="event in filteredEventsByMonth[day.toISOString().split('T')[0]]" :key="event.id" class="truncate text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900 rounded-sm px-1 py-0.5">
            {{ formatEventTime(event.start.dateTime) }} {{ event.summary }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for MonthView here */
</style>
