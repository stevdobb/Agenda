import { useAuthStore } from '@/stores/auth'

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3'

interface CalendarEvent {
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export async function createCalendarEvent(event: CalendarEvent) {
  const authStore = useAuthStore()
  if (!authStore.accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authStore.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Failed to create event:', error)
    throw new Error(`Failed to create event: ${error.error.message}`)
  }

  return await response.json()
}
