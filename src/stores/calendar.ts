
import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue' // Import computed
import { getBelgianHolidays } from '@/services/holidayService'
import { calculateWorkingDays } from '@/lib/utils' // Import calculateWorkingDays
import { format } from 'date-fns' // Import format from date-fns

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

interface RunningRaceData {
  summary: string
  dtstart: string
  dtend: string
}

const STORAGE_KEY = 'calendarEvents'
const TYPES_STORAGE_KEY = 'calendarEventTypes'
const HIDDEN_TYPES_STORAGE_KEY = 'hiddenEventTypes' // New: Storage key for hidden event types
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
  const hiddenEventTypes = ref<Set<string>>(new Set()) // New: To store event types that are currently hidden

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
        }
        
        // Add default running race events from ICS data
        const runningRaceType = defaultEventTypes.find(t => t.name === 'Loopwedstrijd');
        if (runningRaceType) {
            const runningRaceEventsData: RunningRaceData[] = [
                // { summary: 'Loop van de Kust – Zeebrugge', dtstart: '20260703T200000', dtend: '20260703T220000' },
                // { summary: 'Loop van de Kust – Oostende', dtstart: '20260710T193000', dtend: '20260710T213000' },
                // { summary: 'Loop van de Kust – Knokke-Heist', dtstart: '20260712T193000', dtend: '20260712T213000' },
                // { summary: 'Loop van de Kust – Koksijde', dtstart: '20260715T200000', dtend: '20260715T220000' },
                // { summary: 'Loop van de Kust – De Panne', dtstart: '20260727T193000', dtend: '20260727T213000' },
                // { summary: 'Loop van de Kust – Wenduine', dtstart: '20260731T200000', dtend: '20260731T220000' },
                // { summary: 'Loop van de Kust – Blankenberge', dtstart: '20260801T193000', dtend: '20260801T213000' },
                // { summary: 'Loop van de Kust – Nieuwpoort', dtstart: '20260810T193000', dtend: '20260810T213000' },
                // { summary: 'Loop van de Kust – Bredene', dtstart: '20260814T193000', dtend: '20260814T213000' },
                // { summary: 'Loop van de Kust – Middelkerke', dtstart: '20260828T200000', dtend: '20260828T220000' },
            ];

            const runningRaceEvents: CalendarEvent[] = runningRaceEventsData.map(race => ({
                id: crypto.randomUUID(),
                startDate: race.dtstart.substring(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), // Convert YYYYMMDD to YYYY-MM-DD
                endDate: race.dtend.substring(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),   // Convert YYYYMMDD to YYYY-MM-DD
                type: race.summary,
                color: runningRaceType.color,
            }));
            events.value.push(...runningRaceEvents);
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

  watch(
    hiddenEventTypes,
    (newHiddenTypes) => {
      localStorage.setItem(HIDDEN_TYPES_STORAGE_KEY, JSON.stringify(Array.from(newHiddenTypes)))
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
    const dateString = format(date, 'yyyy-MM-dd')
    return events.value.filter(event => {
      return dateString >= event.startDate && dateString <= event.endDate && !hiddenEventTypes.value.has(event.type)
    })
  }

  function setData({ newEvents, newTypes }: { newEvents: CalendarEvent[], newTypes: EventType[] }) {
    events.value = newEvents
    eventTypes.value = newTypes
  }

  function clearData() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TYPES_STORAGE_KEY)
    localStorage.removeItem(HIDDEN_TYPES_STORAGE_KEY) // Clear hidden types as well
    window.location.reload()
  }

  function toggleEventTypeVisibility(type: string) {
    // Create a new Set to trigger reactivity
    const newHiddenTypes = new Set(hiddenEventTypes.value);
    if (newHiddenTypes.has(type)) {
      newHiddenTypes.delete(type);
    } else {
      newHiddenTypes.add(type);
    }
    hiddenEventTypes.value = newHiddenTypes; // Assign new Set to trigger watch
  }

  const leaveDayStats = computed(() => {
    let plannedDays = 0
    const currentYear = new Date().getFullYear();
    const allHolidays = getBelgianHolidays(currentYear).map(h => h.date);

    events.value.forEach(event => {
      // Only consider non-'Wettelijke feestdag' events for leave day calculation
      // 'Wettelijke feestdag' (legal holiday) events are not counted as planned leave days.
      if (event.type !== 'Wettelijke feestdag' && !event.type.startsWith('Loop van de Kust')) {
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
    selectedEvent,
    hiddenEventTypes, // New: Return hiddenEventTypes
    toggleEventTypeVisibility, // New: Return toggleEventTypeVisibility
  };
})