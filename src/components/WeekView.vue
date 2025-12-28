<script setup lang="ts">
import { defineProps, computed } from 'vue'
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

const startOfWeek = computed(() => {
  const date = new Date(props.currentDate);
  const day = date.getDay(); // Sunday - 0, Monday - 1, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
})

const endOfWeek = computed(() => {
  const date = new Date(startOfWeek.value);
  date.setDate(date.getDate() + 6);
  return date;
})

const weekDays = computed(() => {
  const days = [];
  let day = new Date(startOfWeek.value);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return days;
})

const filteredEventsByWeek = computed(() => {
  const weekEvents: { [key: string]: any[] } = {};
  weekDays.value.forEach(day => {
    const dateKey = day.toISOString().split('T')[0];
    weekEvents[dateKey] = [];
  });

  props.events.forEach(event => {
    const eventDateStr = (event.start.date || event.start.dateTime).split('T')[0];
    if (weekEvents[eventDateStr]) {
      weekEvents[eventDateStr].push(event);
    }
  });

  // Sort events within each day
  for (const dateKey in weekEvents) {
    weekEvents[dateKey].sort((a, b) => {
      const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
      const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
      return timeA - timeB;
    });
  }

  return weekEvents;
})

const currentWeekRange = computed(() => {
  const start = startOfWeek.value.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const end = endOfWeek.value.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
})

function navigateWeek(direction: 'prev' | 'next') {
  const newDate = new Date(props.currentDate);
  if (direction === 'prev') {
    newDate.setDate(newDate.getDate() - 7);
  } else {
    newDate.setDate(newDate.getDate() + 7);
  }
  emit('update:currentDate', newDate);
}

function goToToday() {
  emit('update:currentDate', new Date());
}
</script>

<template>
  <div class="mt-8 border-t dark:border-gray-700 pt-6">
    <!-- Week Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button @click="navigateWeek('prev')" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
        <ChevronLeftIcon class="h-5 w-5" />
      </button>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{ currentWeekRange }}</h3>
      <button @click="navigateWeek('next')" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
        <ChevronRightIcon class="h-5 w-5" />
      </button>
    </div>
    <div class="flex justify-center mb-4">
      <button @click="goToToday" class="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition">Today</button>
    </div>

    <!-- Week Days and Events -->
    <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
      <div v-for="day in weekDays" :key="day.toISOString()" class="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
        <h4 class="font-bold text-center mb-2">{{ day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) }}</h4>
        <div v-if="filteredEventsByWeek[day.toISOString().split('T')[0]] && filteredEventsByWeek[day.toISOString().split('T')[0]].length > 0">
          <ul class="space-y-2">
            <li v-for="event in filteredEventsByWeek[day.toISOString().split('T')[0]]" :key="event.id" class="text-sm">
              <p class="font-medium">{{ formatEventTime(event.start.dateTime) }} - {{ event.summary }}</p>
            </li>
          </ul>
        </div>
        <div v-else class="text-center text-gray-500 dark:text-gray-400 text-sm">No events</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles for WeekView here */
</style>
