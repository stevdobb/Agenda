
import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue' // Import computed
import { getBelgianHolidays, getBelgianSchoolHolidays } from '@/services/holidayService'
import { calculateWorkingDays } from '@/lib/utils' // Import calculateWorkingDays
import { format } from 'date-fns' // Import format from date-fns

export interface CalendarEvent {
  id: string
  startDate: string
  endDate: string
  type: string
  color: string
  customName?: string
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
const LEAVE_DAYS_STORAGE_KEY = 'totalLeaveDays' // New: Storage key for total leave days

const excludedTypesForLeave = new Set(['Wettelijke feestdag', 'Venise', 'Loopwedstrijd', 'Schoolvakantie', 'Extra op te nemen verlofdag / overuren', 'Custom event (telt niet mee als verlofdag)']);

const defaultEventTypes: EventType[] = [
  { name: 'Wettelijke feestdag', color: '#D32F2F' },
  { name: 'Schoolvakantie', color: '#D3D3D3' },
  { name: 'Verlof', color: '#1976D2' },
  { name: 'halve dag verlof', color: '#42A5F5' },
  { name: 'Venise', color: '#388E3C' },
  { name: 'Loopwedstrijd', color: '#FBC02D' },
  { name: 'Extra op te nemen verlofdag / overuren', color: '#7E57C2' },
  { name: 'Custom event (telt niet mee als verlofdag)', color: '#808080' }
]

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref<CalendarEvent[]>([])
  const eventTypes = ref<EventType[]>([])
  const selectedEvent = ref<CalendarEvent | null>(null) // New: To store the event being edited
  const hiddenEventTypes = ref<Set<string>>(new Set()) // New: To store event types that are currently hidden
  const totalLeaveDays = ref(32) // New: For configurable leave days

  const includedLeaveTypes = computed(() => {
    return eventTypes.value.filter(type => !excludedTypesForLeave.has(type.name));
  });

  // Load from localStorage
  const storedEvents = localStorage.getItem(STORAGE_KEY)
  const storedTypes = localStorage.getItem(TYPES_STORAGE_KEY)
  const storedHiddenTypes = localStorage.getItem(HIDDEN_TYPES_STORAGE_KEY)
  const storedLeaveDays = localStorage.getItem(LEAVE_DAYS_STORAGE_KEY)

  if (storedEvents) {
    events.value = JSON.parse(storedEvents)
  }

  if (storedTypes) {
    eventTypes.value = JSON.parse(storedTypes)
  } else {
    eventTypes.value = defaultEventTypes
  }

  if (storedLeaveDays) {
    totalLeaveDays.value = JSON.parse(storedLeaveDays)
  }

  // Ensure 'halve dag verlof' is always present
  const halfDayLeaveType = { name: 'halve dag verlof', color: '#42A5F5' };
  if (!eventTypes.value.some(type => type.name === halfDayLeaveType.name)) {
    const verlofIndex = eventTypes.value.findIndex(type => type.name === 'Verlof');
    if (verlofIndex !== -1) {
      eventTypes.value.splice(verlofIndex + 1, 0, halfDayLeaveType);
    } else {
      eventTypes.value.push(halfDayLeaveType);
    }
  }

  const extraLeaveType = { name: 'Extra op te nemen verlofdag / overuren', color: '#7E57C2' };
  if (!eventTypes.value.some(type => type.name === extraLeaveType.name)) {
    eventTypes.value.push(extraLeaveType);
  }

  const customEventType = { name: 'Custom event (telt niet mee als verlofdag)', color: '#808080' };
  if (!eventTypes.value.some(type => type.name === customEventType.name)) {
    eventTypes.value.push(customEventType);
  }

  if (storedHiddenTypes) {
    hiddenEventTypes.value = new Set(JSON.parse(storedHiddenTypes))
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

    const schoolHolidays = getBelgianSchoolHolidays(currentYear)
    const schoolHolidayType = defaultEventTypes.find(t => t.name === 'Schoolvakantie')
    if (schoolHolidayType) {
      const schoolHolidayEvents: CalendarEvent[] = schoolHolidays.map(h => ({
        id: crypto.randomUUID(),
        startDate: h.startDate,
        endDate: h.endDate,
        type: h.name,
        color: schoolHolidayType.color
      }))
      events.value.push(...schoolHolidayEvents)
    }
        
        // Add default running race events from ICS data
        const runningRaceType = defaultEventTypes.find(t => t.name === 'Loopwedstrijd');
        if (runningRaceType) {
            const runningRaceEventsData: RunningRaceData[] = [
                // { summary: 'Loopcriterium – Zeebrugge', dtstart: '20260703T200000', dtend: '20260703T220000' },
                // { summary: 'Loopcriterium – Oostende', dtstart: '20260710T193000', dtend: '20260710T213000' },
                // { summary: 'Loopcriterium – Knokke-Heist', dtstart: '20260712T193000', dtend: '20260712T213000' },
                // { summary: 'Loopcriterium – Koksijde', dtstart: '20260715T200000', dtend: '20260715T220000' },
                // { summary: 'Loopcriterium – De Panne', dtstart: '20260727T193000', dtend: '20260727T213000' },
                // { summary: 'Loopcriterium – Wenduine', dtstart: '20260731T200000', dtend: '20260731T220000' },
                // { summary: 'Loopcriterium – Blankenberge', dtstart: '20260801T193000', dtend: '20260801T213000' },
                // { summary: 'Loopcriterium – Nieuwpoort', dtstart: '20260810T193000', dtend: '20260810T213000' },
                // { summary: 'Loopcriterium – Bredene', dtstart: '20260814T193000', dtend: '20260814T213000' },
                // { summary: 'Loopcriterium – Middelkerke', dtstart: '20260828T200000', dtend: '20260828T220000' },
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

  watch(
    totalLeaveDays,
    (newLeaveDays) => {
      localStorage.setItem(LEAVE_DAYS_STORAGE_KEY, JSON.stringify(newLeaveDays))
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

  function normalizeColor(color: string) {
    return color.trim().toLowerCase()
  }

  function getEventTypeNameForEvent(event: CalendarEvent) {
    const directMatch = eventTypes.value.find((type) => type.name === event.type)
    if (directMatch) {
      return directMatch.name
    }

    const eventColor = normalizeColor(event.color)
    const colorMatch = eventTypes.value.find((type) => normalizeColor(type.color) === eventColor)
    return colorMatch?.name ?? null
  }

  function isEventHidden(event: CalendarEvent) {
    const typeName = getEventTypeNameForEvent(event)
    if (typeName) {
      return hiddenEventTypes.value.has(typeName)
    }
    return hiddenEventTypes.value.has(event.type)
  }

  function updateEventTypeColor(typeName: string, color: string) {
    const index = eventTypes.value.findIndex((type) => type.name === typeName)
    if (index === -1) {
      return
    }

    const oldColor = eventTypes.value[index].color
    if (normalizeColor(oldColor) === normalizeColor(color)) {
      return
    }

    const eventTypeNames = new Set(eventTypes.value.map((type) => type.name))
    eventTypes.value = eventTypes.value.map((type, typeIndex) => {
      if (typeIndex === index) {
        return { ...type, color }
      }
      return type
    })

    const normalizedOldColor = normalizeColor(oldColor)
    events.value = events.value.map((event) => {
      if (event.type === typeName) {
        return { ...event, color }
      }
      if (!eventTypeNames.has(event.type) && normalizeColor(event.color) === normalizedOldColor) {
        return { ...event, color }
      }
      return event
    })
  }

  function getEventsForDate(date: Date) {
    const dateString = format(date, 'yyyy-MM-dd')
    return events.value.filter(event => {
      return dateString >= event.startDate && dateString <= event.endDate && !isEventHidden(event)
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
    const currentYear = new Date().getFullYear()
    const allHolidays = getBelgianHolidays(currentYear).map((h) => h.date)
    const excludedTypes = excludedTypesForLeave

    events.value.forEach((event) => {
      const resolvedType = getEventTypeNameForEvent(event) ?? event.type
      if (excludedTypes.has(resolvedType)) {
        return
      }

      const start = new Date(event.startDate)
      const end = new Date(event.endDate)

      // Ensure start and end dates are valid before calculating
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const workingDays = calculateWorkingDays(start, end, allHolidays)
        if (resolvedType === 'halve dag verlof') {
          plannedDays += workingDays * 0.5
        } else {
          plannedDays += workingDays
        }
      }
    })

    const remainingDays = totalLeaveDays.value - plannedDays
    return {
      total: totalLeaveDays.value,
      planned: plannedDays,
      remaining: remainingDays
    }
  })

  const monthlyLeaveStats = computed(() => {
    const monthlyUsed = Array.from({ length: 12 }, () => 0);
    const excludedTypes = excludedTypesForLeave;
    const currentYear = new Date().getFullYear();
    const allHolidays = getBelgianHolidays(currentYear).map(h => h.date);
  
    events.value.forEach(event => {
      const resolvedType = getEventTypeNameForEvent(event) ?? event.type;
      if (!excludedTypes.has(resolvedType)) {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          // Process only events within the current year for monthly stats
          if (start.getFullYear() > currentYear || end.getFullYear() < currentYear) {
            return;
          }

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === currentYear) {
                if (calculateWorkingDays(new Date(d), new Date(d), allHolidays) === 1) {
                    const month = d.getMonth();
                    const dayValue = resolvedType === 'halve dag verlof' ? 0.5 : 1;
                    monthlyUsed[month] += dayValue;
                }
            }
          }
        }
      }
    });
    return monthlyUsed;
  });

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
    monthlyLeaveStats,
    selectedEvent,
    hiddenEventTypes, // New: Return hiddenEventTypes
    toggleEventTypeVisibility, // New: Return toggleEventTypeVisibility
    isEventHidden,
    updateEventTypeColor,
    getEventTypeNameForEvent,
    includedLeaveTypes,
    totalLeaveDays,
  };
})
