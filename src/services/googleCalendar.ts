
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

export async function createCalendarEvent(accessToken: string, event: CalendarEvent) {
  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

export async function getUpcomingEvents(accessToken: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250', // Increased limit for broader views (week/month)
  });

  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(`${CALENDAR_API_URL}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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
