<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore, type CalendarEvent } from '@/stores/calendar'

const store = useCalendarStore()

const year = computed(() => new Date().getFullYear())
const months = Array.from({ length: 12 }, (_, i) => i)
const schoolHolidayTypeName = 'Schoolvakantie'
const schoolHolidayColor = computed(() => {
  return store.eventTypes.find((type) => type.name === schoolHolidayTypeName)?.color
})
const monthlyStats = computed(() => store.monthlyLeaveStats)

function getMonthName(monthIndex: number) {
  return new Date(year.value, monthIndex, 1).toLocaleString('nl-NL', { month: 'long' })
}

function getDaysInMonth(monthIndex: number) {
  return new Date(year.value, monthIndex + 1, 0).getDate()
}

function getFirstDayOfMonth(monthIndex: number) {
  const day = new Date(year.value, monthIndex, 1).getDay()
  return (day + 6) % 7
}

function getEventsForMonth(monthIndex: number) {
  return store.events.filter(event => {
    const date = new Date(event.startDate)
    return (
      date.getFullYear() === year.value &&
      date.getMonth() === monthIndex &&
      isEventVisible(event)
    )
  }).sort((a, b) => {
    const timeA = new Date(a.startDate).getTime()
    const timeB = new Date(b.startDate).getTime()
    return timeA - timeB
  })
}

function getEventDateDisplay(event: any) {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)

    if (start.toDateString() === end.toDateString()) {
        return start.getDate().toString()
    } else if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()}`
    }
    return `${start.getDate()}/${start.getMonth() + 1}-${end.getDate()}/${end.getMonth() + 1}`
}

function isSchoolHolidayEvent(event: CalendarEvent) {
  const color = schoolHolidayColor.value
  return Boolean(color && event.color === color)
}

function isEventVisible(event: CalendarEvent) {
  return !store.isEventHidden(event)
}

function isDateInRange(event: CalendarEvent, time: number) {
  const start = new Date(event.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(event.endDate)
  end.setHours(0, 0, 0, 0)
  return time >= start.getTime() && time <= end.getTime()
}

function isSchoolHolidayDay(monthIndex: number, day: number) {
  const date = new Date(year.value, monthIndex, day)
  date.setHours(0, 0, 0, 0)
  const time = date.getTime()

  return store.events.some((event) => {
    if (!isSchoolHolidayEvent(event)) {
      return false
    }
    if (!isEventVisible(event)) {
      return false
    }
    return isDateInRange(event, time)
  })
}

function getDayWrapperClass(monthIndex: number, day: number) {
  return isSchoolHolidayDay(monthIndex, day) ? 'school-holiday-day' : ''
}

function getEventForDay(monthIndex: number, day: number): CalendarEvent | undefined {
  const date = new Date(year.value, monthIndex, day);
  date.setHours(0, 0, 0, 0);
  const time = date.getTime();

  return store.events.find((e) => {
    if (!isEventVisible(e)) {
      return false;
    }
    if (!isDateInRange(e, time)) {
      return false;
    }
    if (isSchoolHolidayEvent(e)) {
      return false;
    }
    return true;
  });
}

function getDayStyle(monthIndex: number, day: number) {
  const event = getEventForDay(monthIndex, day);

  if (event && event.color) {
    const resolvedType = store.getEventTypeNameForEvent(event) ?? event.type;
    if (resolvedType === 'halve dag verlof') {
      return {}; // No special style for the inner div
    }
    return {
      backgroundColor: event.color,
      color: '#f8fcff',
      fontWeight: 'bold'
    }
  }
  return {}
}

function getDayBorderClass(monthIndex: number, day: number) {
  const event = getEventForDay(monthIndex, day);
  if (event) {
    const resolvedType = store.getEventTypeNameForEvent(event) ?? event.type;
    if (resolvedType === 'halve dag verlof') {
      return 'half-day-marker';
    }
  }
  return '';
}

function getEventTextStyle(event: CalendarEvent) {
  if (isSchoolHolidayEvent(event)) {
    return { color: '#000000' }
  }
  return { color: event.color }
}
</script>

<template>
  <div class="year-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div v-for="month in months" :key="month" class="year-month-card flex flex-col rounded-lg border p-4">
      <h3 class="month-title mb-3 text-center text-lg font-bold capitalize">{{ getMonthName(month) }}</h3>
      
      <div v-if="monthlyStats[month] > 0" class="month-meta mb-2 text-center text-xs">
        <span>Gebruikt: {{ monthlyStats[month] }}</span>
      </div>
      
      <!-- Calendar Grid -->
      <div class="month-grid mb-4 grid grid-cols-7 gap-1 text-center text-xs">
        <div v-for="day in ['M','D','W','D','V','Z','Z']" :key="day" class="weekday-label font-bold">{{ day }}</div>
        <div v-for="blank in getFirstDayOfMonth(month)" :key="`blank-${blank}`"></div>
        <div 
          v-for="day in getDaysInMonth(month)" 
          :key="day" 
          :class="['month-day-cell p-1', getDayWrapperClass(month, day), getDayBorderClass(month, day)]"
        >
            <div 
                class="month-day-badge mx-auto flex h-6 w-6 items-center justify-center rounded-full transition"
                :style="getDayStyle(month, day)"
            >
                {{ day }}
            </div>
        </div>
      </div>

      <!-- Events List -->
      <div class="month-events space-y-2 border-t pt-2">
        <div v-for="event in getEventsForMonth(month)" :key="event.id" class="event-row flex items-start space-x-2 text-xs">
            <span class="event-date min-w-[1.25rem] shrink-0 text-right font-bold">{{ getEventDateDisplay(event) }}</span>
            <span class="event-text truncate" :title="event.customName || event.type" :style="getEventTextStyle(event)">{{ event.customName || event.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.year-month-card {
  border-color: hsl(var(--border) / 0.66);
  background-color: hsl(var(--card) / 0.9);
  color: hsl(var(--card-foreground));
  box-shadow: 0 12px 24px hsl(218 58% 20% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.18);
}

.month-title {
  color: hsl(var(--card-foreground));
}

.month-meta,
.weekday-label {
  color: hsl(var(--muted-foreground));
}

.month-day-cell {
  border-radius: 0.45rem;
}

.month-day-badge {
  color: hsl(var(--card-foreground));
}

.month-day-badge:hover {
  background-color: hsl(var(--accent) / 0.34);
}

.school-holiday-day {
  border-radius: 0.45rem;
  background-color: hsl(var(--secondary) / 0.55);
}

.half-day-marker {
  border-right: 2px solid hsl(var(--card-foreground) / 0.8);
  border-top: 2px solid hsl(var(--card-foreground) / 0.8);
}

.month-events {
  border-color: hsl(var(--border) / 0.6);
}

.event-row {
  border: 1px solid hsl(210 10% 72% / 0.9);
  border-radius: 0.45rem;
  background-color: hsl(210 14% 92% / 0.95);
  padding: 0.3rem 0.45rem;
}

.event-date {
  color: #000000;
}

.event-text {
  color: hsl(var(--card-foreground));
}

@media print {
  .year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: start;
  }

  .year-month-card {
    border-color: hsl(20 5.9% 90%);
    background-color: #fff;
    color: hsl(20 14.3% 4.1%);
    box-shadow: none;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .month-grid,
  .month-events {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .month-meta,
  .weekday-label {
    color: hsl(25 5.3% 44.7%);
  }

  .month-day-badge:hover {
    background-color: transparent;
  }

  .school-holiday-day {
    background-color: hsl(60 4.8% 95.9%);
  }

  .half-day-marker {
    border-right-color: #000;
    border-top-color: #000;
  }

  .month-events {
    border-color: hsl(20 5.9% 90%);
  }

  .event-row {
    border-color: hsl(20 5.9% 86%);
    background-color: hsl(0 0% 98%);
  }

  .event-date {
    color: hsl(24 9.8% 20%);
  }
}
</style>
