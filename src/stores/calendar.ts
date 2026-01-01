
import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue' // Import computed
import { getBelgianHolidays } from '@/services/holidayService'
import { calculateWorkingDays } from '@/lib/utils' // Import calculateWorkingDays

export interface CalendarEvent {
  id: string
  startDate: string
  endDate: string
  type: string
  color: string
}

export interface EventType {
  name: string
  color: string
}

const STORAGE_KEY = 'calendarEvents'
const TYPES_STORAGE_KEY = 'calendarEventTypes'
const TOTAL_LEAVE_DAYS = 32 // Fixed total leave days

const defaultEventTypes: EventType[] = [
  { name: 'Wettelijke feestdag', color: '#D32F2F' },
  { name: 'Verlof', color: '#1976D2' },
  { name: 'Venise', color: '#388E3C' },
  { name: 'Loopwedstrijd', color: '#FBC02D' }
]

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref<CalendarEvent[]>([])
  const eventTypes = ref<EventType[]>([])
  const selectedEvent = ref<CalendarEvent | null>(null) // New: To store the event being edited

  // Load from localStorage
  const storedEvents = localStorage.getItem(STORAGE_KEY)
  const storedTypes = localStorage.getItem(TYPES_STORAGE_KEY)

  if (storedEvents) {
    events.value = JSON.parse(storedEvents)
  }

  if (storedTypes) {
    eventTypes.value = JSON.parse(storedTypes)
  } else {
    eventTypes.value = defaultEventTypes
  }

  if (!storedEvents && !storedTypes) {
    const currentYear = new Date().getFullYear()
    const holidays = getBelgianHolidays(currentYear)
          const holidayType = defaultEventTypes.find(t => t.name === 'Wettelijke feestdag')
        if (holidayType) {
          const holidayEvents: CalendarEvent[] = holidays.map(h => ({
            id: crypto.randomUUID(),
            startDate: h.date,
            endDate: h.date,
            type: h.name, // Use the specific holiday name
            color: holidayType.color
          }))
          events.value.push(...holidayEvents)
        }  }


  // Watch for changes and save to localStorage
  watch(
    events,
    (newEvents) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents))
    },
    { deep: true }
  )

  watch(
    eventTypes,
    (newTypes) => {
      localStorage.setItem(TYPES_STORAGE_KEY, JSON.stringify(newTypes))
    },
    { deep: true }
  )

  function addEvent(event: Omit<CalendarEvent, 'id'>) {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID()
    }
    events.value.push(newEvent)
  }

  function updateEvent(updatedEvent: CalendarEvent) {
    const index = events.value.findIndex((e) => e.id === updatedEvent.id)
    if (index !== -1) {
      events.value[index] = updatedEvent
    }
  }

  function removeEvent(eventId: string) {
    events.value = events.value.filter((e) => e.id !== eventId)
  }

  function addEventType(type: EventType) {
    if (!eventTypes.value.find((t) => t.name.toLowerCase() === type.name.toLowerCase())) {
      eventTypes.value.push(type)
    }
  }
  
  function getEventsForDate(date: Date) {
    const dateString = date.toISOString().split('T')[0]
    return events.value.filter(event => {
      return dateString >= event.startDate && dateString <= event.endDate
    })
  }

  function setData({ newEvents, newTypes }: { newEvents: CalendarEvent[], newTypes: EventType[] }) {
    events.value = newEvents
    eventTypes.value = newTypes
  }

  function clearData() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TYPES_STORAGE_KEY)
    window.location.reload()
  }

  const leaveDayStats = computed(() => {
    let plannedDays = 0
    const currentYear = new Date().getFullYear();
    const allHolidays = getBelgianHolidays(currentYear).map(h => h.date);

    events.value.forEach(event => {
      // Only consider non-'Wettelijke feestdag' events for leave day calculation
      // 'Wettelijke feestdag' (legal holiday) events are not counted as planned leave days.
      if (event.type !== 'Wettelijke feestdag') {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        
        // Ensure start and end dates are valid before calculating
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          plannedDays += calculateWorkingDays(start, end, allHolidays);
        }
      }
    });

    const remainingDays = TOTAL_LEAVE_DAYS - plannedDays
    return {
      total: TOTAL_LEAVE_DAYS,
      planned: plannedDays,
      remaining: remainingDays
    }
  })

  return {
    events,
    eventTypes,
    addEvent,
    updateEvent,
    removeEvent,
    addEventType,
    getEventsForDate,
    setData,
    clearData,
    leaveDayStats,
    selectedEvent, // New: Return selectedEvent
  }
})
