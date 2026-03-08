
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3'

interface CalendarEvent {
  summary: string;
  start: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export async function getCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const allCalendars: GoogleCalendarListEntry[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      maxResults: '250',
      showHidden: 'false',
      showDeleted: 'false',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${CALENDAR_API_URL}/users/me/calendarList?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to fetch calendar list:', error)
      throw new Error(`Failed to fetch calendar list: ${error.error.message}`)
    }

    const data = await response.json()
    allCalendars.push(...(data.items || []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return allCalendars
}

export async function createCalendarEvent(accessToken: string, event: CalendarEvent, calendarId: string = 'primary') {
  const encodedCalendarId = encodeURIComponent(calendarId)
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodedCalendarId}/events`, {
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
  const allEvents: any[] = []
  let pageToken: string | undefined
  const encodedCalendarId = encodeURIComponent('primary')

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodedCalendarId}/events?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to fetch events:', error)
      throw new Error(`Failed to fetch events: ${error.error.message}`)
    }

    const data = await response.json()
    allEvents.push(...(data.items || []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return allEvents
}

export async function getUpcomingEventsForCalendar(accessToken: string, timeMin: string, timeMax: string, calendarId: string) {
  const allEvents: any[] = []
  let pageToken: string | undefined
  const encodedCalendarId = encodeURIComponent(calendarId)

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodedCalendarId}/events?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`Failed to fetch events for calendar ${calendarId}:`, error)
      throw new Error(`Failed to fetch events: ${error.error.message}`)
    }

    const data = await response.json()
    allEvents.push(...(data.items || []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return allEvents
}

export async function deleteCalendarEvent(accessToken: string, eventId: string, calendarId: string = 'primary') {
  const encodedCalendarId = encodeURIComponent(calendarId)
  const encodedEventId = encodeURIComponent(eventId)
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodedCalendarId}/events/${encodedEventId}`, {
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

export async function updateCalendarEvent(accessToken: string, eventId: string, event: CalendarEvent, calendarId: string = 'primary') {
  const encodedCalendarId = encodeURIComponent(calendarId)
  const encodedEventId = encodeURIComponent(eventId)
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodedCalendarId}/events/${encodedEventId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Failed to update event:', error)
    throw new Error(`Failed to update event: ${error.error.message}`)
  }

  return await response.json()
}
