import { format, parseISO, addDays } from 'date-fns';
import type { CalendarEvent } from '@/stores/calendar';

export interface ParsedIcsEvent {
  uid: string;
  summary: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description?: string;
  // Add other properties as needed
}

export function parseIcsContent(icsContent: string): ParsedIcsEvent[] {
  const events: ParsedIcsEvent[] = [];
  const lines = icsContent.split(/\r\n|\n/);
  let currentEvent: Partial<ParsedIcsEvent> = {};
  let inEvent = false;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (currentEvent.uid && currentEvent.summary && currentEvent.startDate && currentEvent.endDate) {
        events.push(currentEvent as ParsedIcsEvent);
      }
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring('SUMMARY:'.length).trim();
      } else if (line.startsWith('DTSTART;')) { // Handle properties with parameters
        const parts = line.split(':');
        const value = parts.pop()?.trim();
        const params = parts.join(':').substring('DTSTART;'.length).split(';').map(p => p.trim());
        if (value) {
            // Check for VALUE=DATE (YYYYMMDD) vs VALUE=DATE-TIME (YYYYMMDDTHHMMSS)
            if (params.includes('VALUE=DATE')) {
                currentEvent.startDate = format(parseISO(value), 'yyyy-MM-dd');
            } else { // Assume DATE-TIME
                currentEvent.startDate = format(parseISO(value.substring(0,8)), 'yyyy-MM-dd');
            }
        }
      } else if (line.startsWith('DTSTART:')) {
        const dtstartStr = line.substring('DTSTART:'.length).trim();
        if (dtstartStr.length === 8) { // YYYYMMDD
          currentEvent.startDate = format(parseISO(dtstartStr), 'yyyy-MM-dd');
        } else if (dtstartStr.length > 8 && dtstartStr.includes('T')) { // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
          currentEvent.startDate = format(parseISO(dtstartStr.substring(0,8)), 'yyyy-MM-dd');
        } else { // Fallback for other formats, try parsing as is
          currentEvent.startDate = format(parseISO(dtstartStr), 'yyyy-MM-dd');
        }
      } else if (line.startsWith('DTEND;')) { // Handle properties with parameters
        const parts = line.split(':');
        const value = parts.pop()?.trim();
        const params = parts.join(':').substring('DTEND;'.length).split(';').map(p => p.trim());
        if (value) {
            // Check for VALUE=DATE (YYYYMMDD) vs VALUE=DATE-TIME (YYYYMMDDTHHMMSS)
            if (params.includes('VALUE=DATE')) {
                // DTEND for VALUE=DATE is exclusive, so subtract one day for inclusive range
                const endDate = parseISO(value);
                endDate.setDate(endDate.getDate() - 1); // Subtract 1 day
                currentEvent.endDate = format(endDate, 'yyyy-MM-dd');
            } else { // Assume DATE-TIME
                currentEvent.endDate = format(parseISO(value.substring(0,8)), 'yyyy-MM-dd');
            }
        }
      } else if (line.startsWith('DTEND:')) {
        const dtendStr = line.substring('DTEND:'.length).trim();
        if (dtendStr.length === 8) { // YYYYMMDD
          // DTEND for YYYYMMDD is exclusive, so subtract one day for inclusive range
          const endDate = parseISO(dtendStr);
          endDate.setDate(endDate.getDate() - 1); // Subtract 1 day
          currentEvent.endDate = format(endDate, 'yyyy-MM-dd');
        } else if (dtendStr.length > 8 && dtendStr.includes('T')) { // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
            currentEvent.endDate = format(parseISO(dtendStr.substring(0,8)), 'yyyy-MM-dd');
        } else { // Fallback for other formats, try parsing as is
            currentEvent.endDate = format(parseISO(dtendStr), 'yyyy-MM-dd');
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring('DESCRIPTION:'.length).trim();
      } else if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring('UID:'.length).trim();
      }
      // Handle other ICS properties if needed
    }
  }

  return events;
}

export function exportIcsContent(events: CalendarEvent[]): string {
  let icsString = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YourApp//EN',
  ].join('\r\n') + '\r\n';

  events.forEach(event => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    const endPlusOne = addDays(end, 1);

    const startDateFormatted = format(start, 'yyyyMMdd');
    const endDateFormatted = format(endPlusOne, 'yyyyMMdd');
    const nowFormatted = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

    const summary = event.customName || event.type;

    icsString += [
      'BEGIN:VEVENT',
      `UID:${event.id}@yourapp.com`,
      `DTSTAMP:${nowFormatted}`,
      `DTSTART;VALUE=DATE:${startDateFormatted}`,
      `DTEND;VALUE=DATE:${endDateFormatted}`,
      `SUMMARY:${summary}`,
      'END:VEVENT'
    ].join('\r\n') + '\r\n';
  });

  icsString += 'END:VCALENDAR\r\n';

  return icsString;
}
