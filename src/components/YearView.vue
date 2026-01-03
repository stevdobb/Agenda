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
  return isSchoolHolidayDay(monthIndex, day) ? 'bg-gray-200 dark:bg-gray-700' : ''
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
      color: '#ffffff',
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
      return 'border-r-2 border-t-2 border-black';
    }
  }
  return '';
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    <div v-for="month in months" :key="month" class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col">
      <h3 class="font-bold text-lg text-center mb-3 dark:text-white capitalize">{{ getMonthName(month) }}</h3>
      
      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs mb-4 text-gray-600 dark:text-gray-400">
        <div v-for="day in ['M','D','W','D','V','Z','Z']" :key="day" class="font-bold">{{ day }}</div>
        <div v-for="blank in getFirstDayOfMonth(month)" :key="`blank-${blank}`"></div>
        <div 
          v-for="day in getDaysInMonth(month)" 
          :key="day" 
          :class="['p-1', getDayWrapperClass(month, day), getDayBorderClass(month, day)]"
        >
            <div 
                class="w-6 h-6 flex items-center justify-center mx-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                :style="getDayStyle(month, day)"
            >
                {{ day }}
            </div>
        </div>
      </div>

      <!-- Events List -->
      <div class="space-y-2 border-t dark:border-gray-700 pt-2 mt-auto">
        <div v-for="event in getEventsForMonth(month)" :key="event.id" class="text-xs flex items-start space-x-2">
            <span class="font-bold text-blue-600 dark:text-blue-400 shrink-0 text-right min-w-[1.25rem]">{{ getEventDateDisplay(event) }}</span>
            <span class="truncate text-gray-800 dark:text-gray-200" :title="event.type" :style="{ color: event.color }">{{ event.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
