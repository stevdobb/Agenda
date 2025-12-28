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

export async function getUpcomingEvents() {
  const authStore = useAuthStore()
  if (!authStore.accessToken) {
    throw new Error('Not authenticated')
  }

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '20', // Limit to a reasonable number
  });

  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authStore.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to fetch events:', error);
    throw new Error(`Failed to fetch events: ${error.error.message}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function deleteCalendarEvent(eventId: string) {
  const authStore = useAuthStore()
  if (!authStore.accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authStore.accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Failed to delete event:', error)
    throw new Error(`Failed to delete event: ${error.error.message}`)
  }

  // DELETE requests to this endpoint return an empty 204 response on success
  return true;
}
