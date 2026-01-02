<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '@/stores/calendar'

const store = useCalendarStore()

const year = computed(() => new Date().getFullYear())
const months = Array.from({ length: 12 }, (_, i) => i)

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
    return date.getFullYear() === year.value && date.getMonth() === monthIndex
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

function getDayStyle(monthIndex: number, day: number) {
  const date = new Date(year.value, monthIndex, day)
  date.setHours(0, 0, 0, 0)
  const time = date.getTime()

  const event = store.events.find(e => {
    const start = new Date(e.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(e.endDate)
    end.setHours(0, 0, 0, 0)
    return time >= start.getTime() && time <= end.getTime()
  })

  if (event && event.color) {
    return {
      backgroundColor: event.color,
      color: '#ffffff',
      fontWeight: 'bold'
    }
  }
  return {}
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
        <div v-for="day in getDaysInMonth(month)" :key="day" class="p-1">
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