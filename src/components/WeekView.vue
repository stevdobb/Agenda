<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'

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

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
</script>

<template>
  <div class="week-view mt-8 border-t border-border/70 pt-6">
    <!-- Week Navigation -->
    <div class="mb-4 flex items-center justify-between">
      <Button @click="navigateWeek('prev')" variant="secondary" size="icon" class="border border-border/70">
        <ChevronLeftIcon class="h-5 w-5" />
      </Button>
      <h3 class="text-lg font-semibold text-card-foreground">{{ currentWeekRange }}</h3>
      <Button @click="navigateWeek('next')" variant="secondary" size="icon" class="border border-border/70">
        <ChevronRightIcon class="h-5 w-5" />
      </Button>
    </div>
    <div class="mb-4 flex justify-center">
      <Button @click="goToToday" class="week-today-button">Today</Button>
    </div>

    <!-- Week Days and Events -->
    <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
      <div
        v-for="day in weekDays"
        :key="day.toISOString()"
        :class="[
          'day-card rounded-md border p-3',
          isToday(day) ? 'day-card-today border-primary/70' : 'border-border/70'
        ]"
      >
        <h4 class="mb-2 text-center font-bold text-card-foreground">{{ day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) }}</h4>
        <div v-if="filteredEventsByWeek[day.toISOString().split('T')[0]] && filteredEventsByWeek[day.toISOString().split('T')[0]].length > 0">
          <ul class="space-y-2">
            <li v-for="event in filteredEventsByWeek[day.toISOString().split('T')[0]]" :key="event.id"
                class="event-chip rounded-md p-1 text-sm"
            >
              <p class="font-medium text-card-foreground">{{ formatEventTime(event.start.dateTime) }} - {{ event.summary }}</p>
            </li>
          </ul>
        </div>
        <div v-else class="text-center text-sm text-muted-foreground">No events</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-card {
  background-color: hsl(var(--background) / 0.2);
}

.day-card-today {
  background-color: hsl(var(--primary) / 0.24);
}

.event-chip {
  border: 1px solid hsl(var(--border) / 0.6);
  background-color: hsl(var(--secondary) / 0.45);
}

.week-today-button {
  border: 1px solid hsl(var(--border) / 0.65);
}
</style>
