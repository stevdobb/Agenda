<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import SettingsModal from '@/components/SettingsModal.vue' // Import SettingsModal
import WeekView from '@/components/WeekView.vue'
import MonthView from '@/components/MonthView.vue'
import Litepicker from '@/components/Litepicker.vue'
import TopMenu from '@/components/TopMenu.vue'
import { PlusIcon, CalendarDaysIcon, TrashIcon, CheckBadgeIcon, QuestionMarkCircleIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid' // Import Cog6ToothIcon, CheckBadgeIcon
import MiniCalendar from '@/components/MiniCalendar.vue'
import chrono from '@/services/customChrono'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent, moveCalendarEvent } from '@/services/googleCalendar'
import { requestAccessToken } from '@/services/gsiService'

const router = useRouter()
const authStore = useAuthStore()
const todoStore = useTodoStore() // Instantiate Todo store
const eventText = ref('')
const isLoading = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<'success' | 'error' | null>(null)
const feedbackUseTodayStyle = ref(false)
const showSettingsModal = ref(false) // State for settings modal
const lastAddedEventId = ref<string | null>(null) // To highlight the last added event
const currentView = ref<'list' | 'week' | 'month'>('list') // State for current view
const currentDate = ref(new Date()) // State for current date (for week/month view navigation)
const tokenRefreshBufferMs = 30 * 1000
const showEventModal = ref(false)
const showCreateHelpModal = ref(false)
const searchQuery = ref('')
const showMiniCalendar = ref(false)
const showNewEventModal = ref(false)
const newEventSummary = ref('')
const newEventDate = ref('')
const newEventStartTime = ref('09:00')
const newEventEndTime = ref('10:00')
const newEventIsAllDay = ref(false)
const newEventLocation = ref('')
const newEventCalendarId = ref('')
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const notificationPermission = ref<NotificationPermission>(
  typeof Notification !== 'undefined' ? Notification.permission : 'denied'
)
const selectedEvent = ref<GoogleCalendarEvent | null>(null)
const editSummary = ref('')
const editDate = ref('')
const editStartTime = ref('09:00')
const editEndTime = ref('10:00')
const editIsAllDay = ref(false)
const editLocation = ref('')
const editCalendarId = ref('')
const singleDateLitepickerOptions = {
  singleMode: true,
  autoApply: true,
  format: 'YYYY-MM-DD',
  lang: 'nl-NL',
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  accountId?: string
  calendarId?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
}

interface GoogleAccount {
  id: string
  accessToken: string
  expiresAt: number
  user?: {
    email?: string
  }
}

// Fetch events whenever auth/view/date changes and user is logged in.
watch(() => [authStore.isLoggedIn, currentDate.value, currentView.value] as const, async ([isLoggedIn, newDate, newView]) => {
  if (!isLoggedIn) return;

  try {
    await ensureActiveAccessToken();
  } catch (error: any) {
    setFeedbackError(`Error: ${error.message}`);
    return;
  }

  const { fetchStart, fetchEnd } = getFetchRangeForView(newView, newDate);
  await authStore.fetchUpcomingEvents(fetchStart, fetchEnd);
}, { immediate: true })


function getFetchRangeForView(view: 'list' | 'week' | 'month', date: Date) {
  // console.log('getFetchRangeForView: Input - view:', view, 'date:', date); // Debug log
  let fetchStart: Date;
  let fetchEnd: Date;

  if (view === 'list') {
    fetchStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    fetchStart.setHours(0, 0, 0, 0);
    fetchEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  } else if (view === 'week') {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    fetchStart = new Date(startOfWeek);
    fetchStart.setDate(startOfWeek.getDate() - 7 * 2);
    fetchEnd = new Date(endOfWeek);
    fetchEnd.setDate(endOfWeek.getDate() + 7 * 2);
  } else {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    fetchStart = new Date(startOfMonth);
    fetchStart.setMonth(startOfMonth.getMonth() - 1);
    fetchEnd = new Date(date.getFullYear(), date.getMonth() + 2, 0);
  }
  return { fetchStart, fetchEnd };
}

function getAccountById(accountId: string | null) {
  if (!accountId) return null
  return (authStore.accounts as GoogleAccount[]).find((account) => account.id === accountId) ?? null
}

async function ensureAccessTokenForAccount(accountId: string | null) {
  const initialAccount = getAccountById(accountId)
  if (!initialAccount) {
    throw new Error('No account found for this event.')
  }

  if (initialAccount.expiresAt > Date.now() + tokenRefreshBufferMs) {
    return initialAccount
  }

  const accountEmail = initialAccount.user?.email
  await requestAccessToken({
    prompt: '',
    hint: accountEmail,
  })

  const refreshedById = getAccountById(initialAccount.id)
  if (refreshedById && refreshedById.expiresAt > Date.now() + 5000) {
    return refreshedById
  }

  const refreshedByEmail = (authStore.accounts as GoogleAccount[]).find(
    (account) => account.user?.email && account.user.email === accountEmail && account.expiresAt > Date.now() + 5000,
  )
  if (refreshedByEmail) {
    return refreshedByEmail
  }

  throw new Error('Could not refresh Google session. Please log in again.')
}

async function ensureActiveAccessToken() {
  return ensureAccessTokenForAccount(authStore.activeAccountId)
}


// Helper to format date and time
function formatEventTime(dateTime: string) {
  if (!dateTime) return 'All day';
  return new Date(dateTime).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !authStore.is24HourFormat,
  });
}

function formatDayHeader(dateString: string) {
  const parts = dateString.split('-').map(part => parseInt(part, 10));
  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

function extractTimeFromInput(input: string) {
  const patterns = [
    /\b(?:at|om)\s*(\d{1,2})(?:[:.u]|h)(\d{2})\b/i,
    /\b(\d{1,2})(?:[:.u]|h)(\d{2})\b/i,
    /\b(?:at|om)\s*(\d{3,4})\b/i,
    /\b(\d{3,4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match) continue;

    let hour: number;
    let minute: number;

    if (match[2]) {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
    } else {
      const timeStr = match[1];
      if (!timeStr) continue;
      if (timeStr.length === 3) {
        hour = parseInt(timeStr.substring(0, 1), 10);
        minute = parseInt(timeStr.substring(1), 10);
      } else {
        hour = parseInt(timeStr.substring(0, 2), 10);
        minute = parseInt(timeStr.substring(2), 10);
      }
    }

    if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
      continue;
    }

    const matchText = match[0];
    const summary = input.replace(matchText, '').replace(/\s{2,}/g, ' ').trim();
    return { summary, hour, minute, matchText };
  }

  return null;
}

function extractDuration(input: string): { minutes: number; matchText: string } | null {
  const patterns: [RegExp, (m: RegExpMatchArray) => number][] = [
    [/\b(\d+)u(\d+)\b/i, (m) => parseInt(m[1]) * 60 + parseInt(m[2])],
    [/\b(\d+(?:[.,]\d+)?)\s*uur\b/i, (m) => Math.round(parseFloat(m[1].replace(',', '.')) * 60)],
    [/\b(\d+(?:[.,]\d+)?)\s*u\b/i, (m) => Math.round(parseFloat(m[1].replace(',', '.')) * 60)],
    [/\b(\d+(?:[.,]\d+)?)\s*h\b/i, (m) => Math.round(parseFloat(m[1].replace(',', '.')) * 60)],
    [/\b(\d+)\s*min(?:uten?)?\b/i, (m) => parseInt(m[1])],
  ]
  for (const [pattern, calc] of patterns) {
    const match = input.match(pattern)
    if (!match) continue
    const minutes = calc(match)
    if (minutes > 0 && minutes <= 24 * 60) {
      return { minutes, matchText: match[0] }
    }
  }
  return null
}

function extractLocation(input: string): { location: string; matchText: string } | null {
  const match = input.match(/\bbij\s+([^,]+?)(?=\s+(?:om|at|op|morgen|tomorrow|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d)|$)/i)
  if (!match || !match[1]?.trim()) return null
  return { location: match[1].trim(), matchText: match[0] }
}

function extractRecurrence(input: string): { rrule: string; matchText: string } | null {
  const dayMap: Record<string, string> = {
    maandag: 'MO', monday: 'MO',
    dinsdag: 'TU', tuesday: 'TU',
    woensdag: 'WE', wednesday: 'WE',
    donderdag: 'TH', thursday: 'TH',
    vrijdag: 'FR', friday: 'FR',
    zaterdag: 'SA', saturday: 'SA',
    zondag: 'SU', sunday: 'SU',
  }
  const dayPattern = Object.keys(dayMap).join('|')
  const dayMatch = input.match(new RegExp(`\\belke\\s+(${dayPattern})\\b`, 'i'))
  if (dayMatch) {
    const day = dayMap[dayMatch[1].toLowerCase()]
    return { rrule: `RRULE:FREQ=WEEKLY;BYDAY=${day}`, matchText: dayMatch[0] }
  }
  const freqPatterns: [RegExp, string][] = [
    [/\b(elke\s+dag|dagelijks)\b/i, 'RRULE:FREQ=DAILY'],
    [/\b(elke\s+week|wekelijks)\b/i, 'RRULE:FREQ=WEEKLY'],
    [/\b(elke\s+(?:2|twee)\s*weken?)\b/i, 'RRULE:FREQ=WEEKLY;INTERVAL=2'],
    [/\b(elke\s+maand|maandelijks)\b/i, 'RRULE:FREQ=MONTHLY'],
    [/\b(elk\s+jaar|jaarlijks)\b/i, 'RRULE:FREQ=YEARLY'],
  ]
  for (const [pattern, rrule] of freqPatterns) {
    const match = input.match(pattern)
    if (match) return { rrule, matchText: match[0] }
  }
  return null
}

function clearFeedback() {
  feedbackMessage.value = ''
  feedbackTone.value = null
  feedbackUseTodayStyle.value = false
}

function setFeedbackSuccess(message: string, useTodayStyle = false) {
  feedbackMessage.value = message
  feedbackTone.value = 'success'
  feedbackUseTodayStyle.value = useTodayStyle
}

function setFeedbackError(message: string) {
  feedbackMessage.value = message
  feedbackTone.value = 'error'
  feedbackUseTodayStyle.value = false
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatAddedTime(date: Date) {
  if (authStore.is24HourFormat && date.getMinutes() === 0) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', hour12: false })
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !authStore.is24HourFormat,
  })
}

function getCreatedEventFeedback(summary: string, startDate: Date, calendarName?: string) {
  const formattedTime = formatAddedTime(startDate)
  const calendarSuffix = calendarName ? ` → ${calendarName}` : ''
  if (isSameLocalDay(startDate, new Date())) {
    return {
      message: `Added today at ${formattedTime}: "${summary}"${calendarSuffix}`,
      useTodayStyle: true,
    }
  }

  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return {
    message: `Added for ${formattedDate} at ${formattedTime}: "${summary}"${calendarSuffix}`,
    useTodayStyle: false,
  }
}

function getCreatedAllDayEventFeedback(summary: string, startDate: Date, calendarName?: string) {
  const calendarSuffix = calendarName ? ` → ${calendarName}` : ''
  if (isSameLocalDay(startDate, new Date())) {
    return {
      message: `Added all-day for today: "${summary}"${calendarSuffix}`,
      useTodayStyle: true,
    }
  }

  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return {
    message: `Added all-day for ${formattedDate}: "${summary}"${calendarSuffix}`,
    useTodayStyle: false,
  }
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeForInput(date: Date) {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function parseDateKey(dateKey: string) {
  const parts = dateKey.split('-').map((part) => parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null
  }

  const [year, month, day] = parts
  return new Date(year, month - 1, day)
}

function parseTimeValue(timeValue: string) {
  const match = timeValue.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null

  const hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null
  }

  return { hour, minute }
}

function getEventDateKey(event: GoogleCalendarEvent) {
  if (event.start.date) {
    return event.start.date
  }

  if (event.start.dateTime) {
    return toLocalDateKey(new Date(event.start.dateTime))
  }

  return ''
}

function isAllDayEvent(event: GoogleCalendarEvent) {
  return Boolean(event.start.date && !event.start.dateTime)
}

function openEventModal(event: GoogleCalendarEvent) {
  selectedEvent.value = event
  editSummary.value = event.summary ?? ''
  editLocation.value = (event as any).location ?? ''
  editCalendarId.value = event.calendarId ?? 'primary'

  if (event.start.dateTime) {
    const start = new Date(event.start.dateTime)
    const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000)
    editDate.value = toLocalDateKey(start)
    editStartTime.value = formatTimeForInput(start)
    editEndTime.value = formatTimeForInput(end)
    editIsAllDay.value = false
  } else {
    editDate.value = event.start.date || toLocalDateKey(new Date())
    editStartTime.value = '09:00'
    editEndTime.value = '10:00'
    editIsAllDay.value = true
  }

  showEventModal.value = true
}

function dismissEventModal() {
  showEventModal.value = false
  selectedEvent.value = null
}

function closeEventModal() {
  if (isLoading.value) return
  dismissEventModal()
}

function closeCreateHelpModal() {
  showCreateHelpModal.value = false
}

async function refreshVisibleEvents() {
  const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value)
  await authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true)
}

const availableCalendarsForEdit = computed(() => {
  const accountId = selectedEvent.value?.accountId ?? authStore.activeAccountId
  const account = authStore.accounts.find((a: any) => a.id === accountId)
  return account?.calendars ?? []
})

const availableCalendarsForCreate = computed(() => {
  const account = authStore.accounts.find((a: any) => a.id === authStore.activeAccountId)
  return account?.calendars ?? []
})

const groupedEvents = computed(() => {
  const groups: { [key: string]: any[] } = {};
  (authStore.upcomingEvents as GoogleCalendarEvent[]).forEach((event) => {
    const dateKey = getEventDateKey(event)
    if (!dateKey) return
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  // Sort groups by date and events within each group by time
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const partsA = a.split('-').map(p => parseInt(p, 10));
    const dateA = new Date(partsA[0], partsA[1] - 1, partsA[2]);
    
    const partsB = b.split('-').map(p => parseInt(p, 10));
    const dateB = new Date(partsB[0], partsB[1] - 1, partsB[2]);

    return dateA.getTime() - dateB.getTime();
  });
  const sortedGroups: { date: string; events: any[] }[] = [];

  sortedKeys.forEach(dateKey => {
    const sortedEvents = groups[dateKey].sort((a, b) => {
      const isAllDayA = Boolean(a.start.date && !a.start.dateTime)
      const isAllDayB = Boolean(b.start.date && !b.start.dateTime)

      if (isAllDayA !== isAllDayB) {
        return isAllDayA ? -1 : 1
      }

      const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
      const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
      return timeA - timeB;
    });
    sortedGroups.push({ date: dateKey, events: sortedEvents });
  });

  return sortedGroups;
});

// New computed property for displayed events based on current view
const displayedGroupedEvents = computed(() => {
  if (currentView.value === 'list') {
    const startDate = new Date(currentDate.value);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    const filteredGroups: { date: string; events: any[] }[] = [];
    groupedEvents.value.forEach(dayGroup => {
      const parts = dayGroup.date.split('-').map(part => parseInt(part, 10));
      const groupDate = new Date(parts[0], parts[1] - 1, parts[2]);
      if (groupDate >= startDate && groupDate <= endDate) {
        filteredGroups.push(dayGroup);
      }
    });
    return filteredGroups;
  }
  // For other views (week, month), we want to show all events that were fetched
  // as the WeekView and MonthView components will handle their own filtering/display logic.
  return groupedEvents.value;
});

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return (authStore.upcomingEvents as any[])
    .filter(event => event.summary?.toLowerCase().includes(q) || event.location?.toLowerCase().includes(q))
    .sort((a, b) => {
      const tA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : new Date(a.start.date).getTime()
      const tB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : new Date(b.start.date).getTime()
      return tA - tB
    })
    .slice(0, 20)
})

async function createEvent() {
  if (!eventText.value.trim() || isLoading.value) return;

  isLoading.value = true;
  clearFeedback();
  lastAddedEventId.value = null; // Clear highlight on new action

  const input = eventText.value.trim();

  // Check if it's a todo item
  if (input.toLowerCase().startsWith('todo ')) {
    const todoContent = input.substring(5).trim();
    if (todoContent) {
      todoStore.addTodo(todoContent);
      setFeedbackSuccess(`Todo added: "${todoContent}"`);
      eventText.value = ''; // Clear input
    } else {
      setFeedbackError('Error: Please provide content for the todo.');
    }
    isLoading.value = false;
    return; // Stop here if it was a todo
  }

  // Otherwise, proceed as a calendar event
  try {
    // Extract /calendarname shortcut (e.g. /work, /wor)
    const calendarSlashMatch = input.match(/\s*\/([^\s/]+)\s*$/)
    let targetCalendarId = 'primary'
    let inputWithoutSlash = input
    if (calendarSlashMatch) {
      const slug = calendarSlashMatch[1].toLowerCase()
      const activeAccount = authStore.accounts.find((a: any) => a.id === authStore.activeAccountId)
      const matched = activeAccount?.calendars?.find((c: any) =>
        c.summary.toLowerCase().startsWith(slug) || c.summary.toLowerCase().includes(slug)
      )
      if (matched) {
        targetCalendarId = matched.id
        inputWithoutSlash = input.slice(0, calendarSlashMatch.index).trim()
      }
    }

    const forceAllDay = /\b(all[\s-]?day|hele\s+dag)\b/i.test(inputWithoutSlash)
    let normalizedInput = inputWithoutSlash
      .replace(/\b(all[\s-]?day|hele\s+dag)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Extract location ("bij ...")
    const locationMatch = extractLocation(normalizedInput)
    const location = locationMatch?.location ?? null
    if (locationMatch) {
      normalizedInput = normalizedInput.replace(locationMatch.matchText, '').replace(/\s{2,}/g, ' ').trim()
    }

    // Extract recurrence ("elke maandag", "elke dag", ...)
    const recurrenceMatch = extractRecurrence(normalizedInput)
    const rrule = recurrenceMatch?.rrule ?? null
    if (recurrenceMatch) {
      normalizedInput = normalizedInput.replace(recurrenceMatch.matchText, '').replace(/\s{2,}/g, ' ').trim()
    }

    // Extract duration ("30min", "2u", ...)
    const durationMatch = extractDuration(normalizedInput)
    if (durationMatch) {
      normalizedInput = normalizedInput.replace(durationMatch.matchText, '').replace(/\s{2,}/g, ' ').trim()
    }

    const parsedResults = chrono.parse(normalizedInput, new Date(), { forwardDate: true })
    const extractedTime = extractTimeFromInput(normalizedInput)
    const timeMatch = forceAllDay ? null : extractedTime

    let summary = '';
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let allDayStartDate: string | null = null;
    let allDayEndDate: string | null = null;

    if (parsedResults.length === 0) {
      summary = extractedTime?.summary ?? normalizedInput;
      if (!summary) {
        throw new Error("Please provide a title for the event.");
      }

      if (!forceAllDay && timeMatch) {
        startDate = new Date();
        startDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
        const durationMs = (durationMatch?.minutes ?? 60) * 60 * 1000
        endDate = new Date(startDate.getTime() + durationMs);
        if (startDate.getTime() <= Date.now()) {
          startDate.setDate(startDate.getDate() + 1)
          endDate.setDate(endDate.getDate() + 1)
        }
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        allDayStartDate = toLocalDateKey(today)
        allDayEndDate = toLocalDateKey(tomorrow)
      }
    } else {
      const result = parsedResults[0];
      summary = normalizedInput.replace(result.text, '').trim();
      if (extractedTime) {
        summary = summary.replace(extractedTime.matchText, '').replace(/\s{2,}/g, ' ').trim();
      }
      summary = summary.replace(/\b(at|om)\b\s*$/i, '').trim();

      if (!summary) {
        throw new Error("Please provide a title for the event.");
      }

      startDate = result.start.date();
      if (forceAllDay) {
        const allDayStart = new Date(startDate)
        allDayStart.setHours(0, 0, 0, 0)

        const inclusiveEnd = result.end ? result.end.date() : new Date(allDayStart)
        inclusiveEnd.setHours(0, 0, 0, 0)
        if (inclusiveEnd.getTime() < allDayStart.getTime()) {
          inclusiveEnd.setTime(allDayStart.getTime())
        }

        const exclusiveEnd = new Date(inclusiveEnd)
        exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
        allDayStartDate = toLocalDateKey(allDayStart)
        allDayEndDate = toLocalDateKey(exclusiveEnd)
      } else {
        const durationMs = (durationMatch?.minutes ?? 60) * 60 * 1000
        endDate = result.end ? result.end.date() : new Date(startDate.getTime() + durationMs);
        if (timeMatch && !result.start.isCertain('hour') && !result.start.isCertain('minute')) {
          startDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
          if (!result.end || (!result.end.isCertain('hour') && !result.end.isCertain('minute'))) {
            endDate = new Date(startDate.getTime() + durationMs);
          }
        } else if (durationMatch && result.end == null) {
          endDate = new Date(startDate.getTime() + durationMs);
        }
      }
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const activeAccount = await ensureActiveAccessToken();
    if (!activeAccount) {
        setFeedbackError('Error: No active account found to create event.');
        isLoading.value = false;
        return;
    }

    const calendarEvent = allDayStartDate && allDayEndDate
      ? {
          summary,
          start: { date: allDayStartDate },
          end: { date: allDayEndDate },
          ...(location ? { location } : {}),
          ...(rrule ? { recurrence: [rrule] } : {}),
        }
      : {
          summary,
          start: { dateTime: startDate!.toISOString(), timeZone },
          end: { dateTime: endDate!.toISOString(), timeZone },
          ...(location ? { location } : {}),
          ...(rrule ? { recurrence: [rrule] } : {}),
        };

    const createdEvent = await createCalendarEvent(activeAccount.accessToken, calendarEvent, targetCalendarId);
    lastAddedEventId.value = createdEvent.id; // Store the ID for highlighting
    const activeAccount2 = authStore.accounts.find((a: any) => a.id === authStore.activeAccountId)
    const calendarName = activeAccount2?.calendars?.find((c: any) => c.id === targetCalendarId)?.summary
    const createdFeedback = allDayStartDate
      ? getCreatedAllDayEventFeedback(summary, parseDateKey(allDayStartDate) ?? new Date(), calendarName)
      : getCreatedEventFeedback(summary, startDate!, calendarName)
    setFeedbackSuccess(createdFeedback.message, createdFeedback.useTodayStyle)
    eventText.value = ''; // Clear input
    
    await refreshVisibleEvents()

  } catch (error: any) {
    setFeedbackError(`Error: ${error.message}`);
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

async function saveSelectedEvent() {
  if (!selectedEvent.value || isLoading.value) return

  const trimmedSummary = editSummary.value.trim()
  if (!trimmedSummary) {
    setFeedbackError('Error: Please provide a title for the event.')
    return
  }
  if (!editDate.value) {
    setFeedbackError('Error: Please select a date.')
    return
  }

  isLoading.value = true;
  clearFeedback();

  const eventToUpdate = selectedEvent.value
  const eventAccountId = eventToUpdate.accountId ?? authStore.activeAccountId
  const account = await ensureAccessTokenForAccount(eventAccountId).catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`);
    return null;
  });
  if (!account) {
    isLoading.value = false;
    return;
  }

  try {
    let payload: {
      summary: string
      location?: string
      start: { dateTime?: string | null; date?: string | null; timeZone?: string | null }
      end: { dateTime?: string | null; date?: string | null; timeZone?: string | null }
    }

    if (editIsAllDay.value) {
      const localStartDate = parseDateKey(editDate.value)
      if (!localStartDate) {
        throw new Error('Invalid selected date.')
      }

      const localExclusiveEndDate = new Date(localStartDate)
      localExclusiveEndDate.setDate(localExclusiveEndDate.getDate() + 1)
      payload = {
        summary: trimmedSummary,
        start: { date: editDate.value, dateTime: null, timeZone: null },
        end: { date: toLocalDateKey(localExclusiveEndDate), dateTime: null, timeZone: null },
      }
    } else {
      const localDate = parseDateKey(editDate.value)
      const startTime = parseTimeValue(editStartTime.value)
      const endTime = parseTimeValue(editEndTime.value)

      if (!localDate || !startTime || !endTime) {
        throw new Error('Please provide a valid date and time.')
      }

      const startDateTime = new Date(localDate)
      startDateTime.setHours(startTime.hour, startTime.minute, 0, 0)
      const endDateTime = new Date(localDate)
      endDateTime.setHours(endTime.hour, endTime.minute, 0, 0)

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        throw new Error('End time must be after start time.')
      }

      const timeZone = eventToUpdate.start.timeZone || eventToUpdate.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      payload = {
        summary: trimmedSummary,
        start: { dateTime: startDateTime.toISOString(), timeZone, date: null },
        end: { dateTime: endDateTime.toISOString(), timeZone, date: null },
      }
    }

    payload.location = editLocation.value.trim() || undefined
    const originalCalendarId = eventToUpdate.calendarId ?? 'primary'
    const targetCalendarId = editCalendarId.value || 'primary'
    let currentCalendarId = originalCalendarId
    if (targetCalendarId !== originalCalendarId) {
      await moveCalendarEvent(account.accessToken, eventToUpdate.id, originalCalendarId, targetCalendarId)
      currentCalendarId = targetCalendarId
    }
    await updateCalendarEvent(account.accessToken, eventToUpdate.id, payload, currentCalendarId)
    setFeedbackSuccess('Event successfully updated.')
    dismissEventModal()
    await refreshVisibleEvents()
  } catch (error: any) {
    setFeedbackError(`Error updating event: ${error.message}`);
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

async function deleteEvent(event: GoogleCalendarEvent) {
  if (isLoading.value) return

  isLoading.value = true
  clearFeedback()

  const eventAccountId = event.accountId ?? authStore.activeAccountId
  const account = await ensureAccessTokenForAccount(eventAccountId).catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`)
    return null
  })
  if (!account) {
    isLoading.value = false
    return
  }

  try {
    await deleteCalendarEvent(account.accessToken, event.id, event.calendarId ?? 'primary')
    setFeedbackSuccess('Event successfully deleted.')
    if (selectedEvent.value?.id === event.id) {
      dismissEventModal()
    }
    await refreshVisibleEvents()
  } catch (error: any) {
    setFeedbackError(`Error deleting event: ${error.message}`)
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

async function deleteSelectedEvent() {
  if (!selectedEvent.value) return
  await deleteEvent(selectedEvent.value)
}

function handleMonthDayClick(date: Date) {
  currentDate.value = date;
  currentView.value = 'list';
}

function navigateList(dir: 'prev' | 'next') {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + (dir === 'prev' ? -7 : 7))
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
  showMiniCalendar.value = false
}

function handleMiniCalSelect(date: Date) {
  currentDate.value = date
  showMiniCalendar.value = false
}

function openNewEventModal(date?: Date) {
  const d = date ?? currentDate.value
  newEventDate.value = toLocalDateKey(d)
  newEventSummary.value = ''
  newEventStartTime.value = '09:00'
  newEventEndTime.value = '10:00'
  newEventIsAllDay.value = false
  newEventLocation.value = ''
  const activeAccount = authStore.accounts.find((a: any) => a.id === authStore.activeAccountId)
  newEventCalendarId.value = activeAccount?.calendars?.find((c: any) => c.primary)?.id ?? activeAccount?.calendars?.[0]?.id ?? 'primary'
  showNewEventModal.value = true
}

function closeNewEventModal() {
  if (isLoading.value) return
  showNewEventModal.value = false
}

async function submitNewEvent() {
  const trimmedSummary = newEventSummary.value.trim()
  if (!trimmedSummary) {
    setFeedbackError('Error: Please provide a title for the event.')
    return
  }
  if (!newEventDate.value) {
    setFeedbackError('Error: Please select a date.')
    return
  }

  isLoading.value = true
  clearFeedback()

  try {
    const activeAccount = await ensureActiveAccessToken()
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    let calendarEvent: any
    let feedbackDate: Date

    if (newEventIsAllDay.value) {
      const localStartDate = parseDateKey(newEventDate.value)
      if (!localStartDate) throw new Error('Invalid date.')
      const localExclusiveEndDate = new Date(localStartDate)
      localExclusiveEndDate.setDate(localExclusiveEndDate.getDate() + 1)
      calendarEvent = {
        summary: trimmedSummary,
        start: { date: newEventDate.value },
        end: { date: toLocalDateKey(localExclusiveEndDate) },
        ...(newEventLocation.value.trim() ? { location: newEventLocation.value.trim() } : {}),
      }
      feedbackDate = localStartDate
    } else {
      const localDate = parseDateKey(newEventDate.value)
      const startTime = parseTimeValue(newEventStartTime.value)
      const endTime = parseTimeValue(newEventEndTime.value)
      if (!localDate || !startTime || !endTime) throw new Error('Please provide a valid date and time.')

      const startDateTime = new Date(localDate)
      startDateTime.setHours(startTime.hour, startTime.minute, 0, 0)
      const endDateTime = new Date(localDate)
      endDateTime.setHours(endTime.hour, endTime.minute, 0, 0)
      if (endDateTime.getTime() <= startDateTime.getTime()) throw new Error('End time must be after start time.')

      calendarEvent = {
        summary: trimmedSummary,
        start: { dateTime: startDateTime.toISOString(), timeZone },
        end: { dateTime: endDateTime.toISOString(), timeZone },
        ...(newEventLocation.value.trim() ? { location: newEventLocation.value.trim() } : {}),
      }
      feedbackDate = startDateTime
    }

    const createdEvent = await createCalendarEvent(activeAccount.accessToken, calendarEvent, newEventCalendarId.value || 'primary')
    lastAddedEventId.value = createdEvent.id
    const calendarNameForFb = availableCalendarsForCreate.value.find((c: any) => c.id === (newEventCalendarId.value || 'primary'))?.summary
    const fb = newEventIsAllDay.value
      ? getCreatedAllDayEventFeedback(trimmedSummary, feedbackDate, calendarNameForFb)
      : getCreatedEventFeedback(trimmedSummary, feedbackDate, calendarNameForFb)
    setFeedbackSuccess(fb.message, fb.useTodayStyle)
    showNewEventModal.value = false
    await refreshVisibleEvents()
  } catch (error: any) {
    setFeedbackError(`Error: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

const listViewDateRange = computed(() => {
  const start = new Date(currentDate.value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
})

async function handleEventMoved(event: GoogleCalendarEvent, newDate: Date) {
  if (isLoading.value) return
  isLoading.value = true
  clearFeedback()

  const eventAccountId = event.accountId ?? authStore.activeAccountId
  const account = await ensureAccessTokenForAccount(eventAccountId).catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`)
    return null
  })
  if (!account) {
    isLoading.value = false
    return
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    let payload: any
    if (event.start.date) {
      // All-day event
      const exclusiveEnd = new Date(newDate)
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
      payload = {
        summary: event.summary ?? '',
        start: { date: toLocalDateKey(newDate), dateTime: null, timeZone: null },
        end: { date: toLocalDateKey(exclusiveEnd), dateTime: null, timeZone: null },
      }
    } else {
      // Timed event — keep the same time, only change the date
      const origStart = new Date(event.start.dateTime!)
      const origEnd = event.end.dateTime ? new Date(event.end.dateTime) : new Date(origStart.getTime() + 60 * 60 * 1000)
      const duration = origEnd.getTime() - origStart.getTime()
      const newStart = new Date(newDate)
      newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0)
      const newEnd = new Date(newStart.getTime() + duration)
      payload = {
        summary: event.summary ?? '',
        start: { dateTime: newStart.toISOString(), timeZone, date: null },
        end: { dateTime: newEnd.toISOString(), timeZone, date: null },
      }
    }

    await updateCalendarEvent(account.accessToken, event.id, payload, event.calendarId ?? 'primary')
    await refreshVisibleEvents()
  } catch (error: any) {
    setFeedbackError(`Error moving event: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function manualFetchEvents() {
  if (!authStore.isLoggedIn) {
    setFeedbackError('Please log in to refresh events.');
    return;
  }

  const activeAccount = await ensureActiveAccessToken().catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`);
    return null;
  });
  if (!activeAccount) {
    return;
  }

  const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value);
  authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true);
  setFeedbackSuccess('Events refreshed.');
}

function isEventToday(event: GoogleCalendarEvent): boolean {
  const eventDateStr = getEventDateKey(event)
  if (!eventDateStr) return false
  
  // Robustly parse YYYY-MM-DD as local date
  const parts = eventDateStr.split('-').map((part: string) => parseInt(part, 10));
  const eventDate = new Date(parts[0], parts[1] - 1, parts[2]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compare year, month, and day for equality in local time
  return eventDate.getTime() === today.getTime();
}

function handleLogin() {
  requestAccessToken().catch((error: any) => {
    setFeedbackError(`Error: ${error.message}`);
  });
}

function handleViewSwitch(view: string) {
  if (view === 'year') {
    router.push('/year')
  } else if (view === 'todos') {
    router.push('/todos')
  } else {
    currentView.value = view as 'list' | 'week' | 'month'
  }
}

function handleOpenSettings() {
  if (window.matchMedia('(max-width: 767px)').matches) {
    router.push('/settings')
    return
  }

  showSettingsModal.value = true
}

// --- Notifications ---
let notificationInterval: ReturnType<typeof setInterval> | null = null
const notifiedIds = new Set<string>(
  JSON.parse(localStorage.getItem('notified_event_ids') ?? '[]')
)

async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  const result = await Notification.requestPermission()
  notificationPermission.value = result
  if (result === 'granted') startNotificationCheck()
}

function startNotificationCheck() {
  if (notificationInterval) return
  checkUpcomingNotifications()
  notificationInterval = setInterval(checkUpcomingNotifications, 60_000)
}

function checkUpcomingNotifications() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  ;(authStore.upcomingEvents as any[]).forEach(event => {
    if (!event.start.dateTime) return
    const eventStart = new Date(event.start.dateTime).getTime()
    const msBefore = eventStart - now
    if (msBefore > 0 && msBefore <= windowMs) {
      const notifKey = `${event.id}:${event.start.dateTime}`
      if (!notifiedIds.has(notifKey)) {
        notifiedIds.add(notifKey)
        localStorage.setItem('notified_event_ids', JSON.stringify([...notifiedIds]))
        const mins = Math.round(msBefore / 60_000)
        new Notification(event.summary ?? 'Event', {
          body: `Starts in ${mins} minute${mins !== 1 ? 's' : ''}`,
          icon: '/pwa-192x192.png',
        })
      }
    }
  })
}

onMounted(() => {
  window.addEventListener('online', () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    startNotificationCheck()
  }
})

onUnmounted(() => {
  if (notificationInterval) clearInterval(notificationInterval)
})
</script>

<template>
  <div class="year-weather-theme">
    <div class="page-container mx-auto max-w-7xl px-4 pt-20 pb-4 sm:px-6 sm:pt-24 sm:pb-6 lg:px-8 lg:pt-24 lg:pb-8">
      <TopMenu 
        :currentView="currentView" 
        :showSettings="true" 
        :showRefresh="true" 
        @update:view="handleViewSwitch" 
        @refresh="manualFetchEvents" 
        @openSettings="handleOpenSettings" 
      />

      <!-- Offline Banner -->
      <div v-if="!isOnline" class="offline-banner mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
        Je bent offline. Gecachede events worden getoond.
      </div>

      <div class="agenda-shell-panel rounded-lg border p-6 sm:p-7">


        <div v-if="authStore.isLoggedIn" class="mt-3">
        <!-- Notification permission banner -->
        <div v-if="notificationPermission === 'default'" class="notif-banner mb-4 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span class="text-card-foreground">Wil je meldingen ontvangen voor aankomende events?</span>
          <button @click="requestNotificationPermission" class="notif-allow-btn ml-3 rounded px-2.5 py-1 text-xs font-medium transition">
            Toestaan
          </button>
        </div>

        <div class="mb-4 flex items-center gap-2">
          <h2 class="text-xl font-semibold text-card-foreground">Create a new event</h2>
          <button
            @click="openNewEventModal()"
            class="mini-cal-toggle-btn rounded-md border p-1 transition"
            title="Nieuw event aanmaken"
          >
            <PlusIcon class="h-4 w-4" />
          </button>
          <button
            @click="showCreateHelpModal = true"
            class="help-icon-button rounded-full p-1 transition"
            aria-label="Show input help"
            title="Show input help"
          >
            <QuestionMarkCircleIcon class="h-5 w-5" />
          </button>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
          autofocus
            v-model="eventText"
            @keyup.enter="createEvent"
            type="text"
            placeholder="e.g., Meeting with John tomorrow at 2pm"
            class="agenda-input flex-grow rounded-md border p-3 transition"
          />
          <button
            @click="createEvent"
            :disabled="isLoading"
            class="agenda-create-button mt-2 flex w-full items-center justify-center rounded-md p-3 text-white transition sm:mt-0 sm:w-16"
            aria-label="Create Event"
          >
             <svg v-if="isLoading" class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <PlusIcon v-else class="h-6 w-6" />
          </button>
        </div>
        <div
          v-if="feedbackMessage"
          class="feedback-alert mt-4 rounded-md border px-3 py-2 text-sm"
          :class="feedbackTone === 'error' ? 'feedback-alert-error' : feedbackUseTodayStyle ? 'event-row-today' : 'feedback-alert-success'"
        >
          {{ feedbackMessage }}
        </div>

        <!-- Search & Date Navigation -->
        <div class="mt-6 border-t border-border/70 pt-4">
          <div class="flex items-center gap-2">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Zoek events..."
              class="agenda-input min-w-0 flex-1 rounded-md border px-3 py-2 text-sm transition"
            />
            <div class="flex flex-shrink-0 items-center gap-1">
              <template v-if="currentView === 'list' && !searchQuery.trim()">
                <button @click="navigateList('prev')" class="mini-cal-toggle-btn rounded-md border p-1.5 transition" title="Vorige week">
                  <ChevronLeftIcon class="h-3.5 w-3.5" />
                </button>
                <button @click="goToToday()" class="mini-cal-toggle-btn rounded-md border px-2.5 py-1.5 text-xs transition">Vandaag</button>
                <button @click="navigateList('next')" class="mini-cal-toggle-btn rounded-md border p-1.5 transition" title="Volgende week">
                  <ChevronRightIcon class="h-3.5 w-3.5" />
                </button>
                <span class="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">{{ listViewDateRange }}</span>
              </template>
              <button
                @click="showMiniCalendar = !showMiniCalendar"
                class="mini-cal-toggle-btn rounded-md border p-1.5 transition"
                :class="showMiniCalendar ? 'mini-cal-toggle-active' : ''"
                title="Datum selecteren"
              >
                <CalendarDaysIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div v-if="showMiniCalendar && !searchQuery.trim()" class="mt-3">
            <MiniCalendar :selectedDate="currentDate" :events="authStore.upcomingEvents" @select="handleMiniCalSelect" />
          </div>
          <div v-if="searchQuery.trim() && searchResults.length > 0" class="mt-3 space-y-1">
            <p class="mb-2 text-xs text-muted-foreground">{{ searchResults.length }} resultaat{{ searchResults.length !== 1 ? 'en' : '' }}</p>
            <ul class="space-y-1">
              <li
                v-for="event in searchResults"
                :key="event.id"
                class="event-row event-row-default flex cursor-pointer items-center justify-between space-x-2 rounded-md border p-2 text-sm transition-all duration-200"
                :style="event.calendarColor ? { borderLeftColor: event.calendarColor, borderLeftWidth: '3px' } : {}"
                @click="openEventModal(event)"
              >
                <div class="flex items-start space-x-2">
                  <p class="w-16 flex-shrink-0 text-xs font-medium text-muted-foreground">
                    {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : getEventDateKey(event) }}
                  </p>
                  <div>
                    <p class="text-sm font-semibold text-card-foreground">{{ event.summary }}</p>
                    <p v-if="event.location" class="text-xs text-muted-foreground">{{ event.location }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div v-else-if="searchQuery.trim() && searchResults.length === 0" class="mt-3 text-sm text-muted-foreground">
            Geen events gevonden.
          </div>
        </div>

        <!-- List View -->
        <div v-if="currentView === 'list' && !searchQuery.trim()" class="mt-6 border-t border-border/70 pt-6">
          <h2 class="mb-4 flex items-center text-xl font-semibold text-card-foreground">
            <CalendarDaysIcon class="mr-2 h-6 w-6 text-muted-foreground" />
            Upcoming Events
          </h2>
          <div v-if="authStore.isFetchingEvents" class="mb-4 space-y-1.5">
            <p class="text-xs text-muted-foreground">
              <span v-if="authStore.fetchProgress && authStore.fetchProgress.total > 0">
                Agenda's laden ({{ authStore.fetchProgress.current }}/{{ authStore.fetchProgress.total }})...
              </span>
              <span v-else>Agenda's ophalen...</span>
            </p>
            <div class="fetch-progress-track rounded-full">
              <div
                class="fetch-progress-bar rounded-full transition-all duration-300"
                :style="authStore.fetchProgress && authStore.fetchProgress.total > 0
                  ? { width: `${Math.round((authStore.fetchProgress.current / authStore.fetchProgress.total) * 100)}%` }
                  : { width: '15%' }"
              ></div>
            </div>
          </div>
          <div v-if="displayedGroupedEvents.length > 0" class="space-y-6 xl:grid xl:grid-cols-4 xl:space-y-0 xl:gap-6">
            <div v-for="dayGroup in displayedGroupedEvents" :key="dayGroup.date" class="space-y-3">
              <h3 class="mb-1 border-b border-border/70 pb-1 text-sm font-semibold text-card-foreground">
                {{ formatDayHeader(dayGroup.date) }}
              </h3>
              <ul class="space-y-1">
                <li
                  v-for="event in dayGroup.events"
                  :key="event.id"
                  :class="[
                    'event-row flex cursor-pointer items-center justify-between space-x-2 rounded-md border text-sm transition-all duration-200',
                    isAllDayEvent(event) ? 'event-row-all-day' : '',
                    event.id === lastAddedEventId
                      ? 'event-row-success shadow'
                      : isEventToday(event)
                        ? 'event-row-today'
                        : 'event-row-default'
                  ]"
                  :style="event.calendarColor
                    ? { borderLeftColor: event.calendarColor, borderLeftWidth: '3px', paddingTop: '8px', paddingBottom: '8px', paddingRight: '8px', paddingLeft: '8px' }
                    : { padding: '8px' }"
                  @click="openEventModal(event)"
                >
                  <div class="flex items-start space-x-2">
                    <p v-if="isAllDayEvent(event)" class="event-all-day-label flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold">
                      All day
                    </p>
                    <p v-else class="w-16 flex-shrink-0 text-xs font-medium text-muted-foreground">
                      {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : 'All day' }}
                    </p>
                    <div>
                      <p class="text-sm font-semibold text-card-foreground">{{ event.summary }}</p>
                      <p v-if="event.location" class="text-xs text-muted-foreground">{{ event.location }}</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div v-else class="rounded-md border-2 border-dashed border-border/70 p-4 text-center text-muted-foreground">
            <p>No upcoming events found.</p>
          </div>
        </div>
        <!-- Week View -->
        <div v-if="currentView === 'week' && authStore.isLoggedIn && !searchQuery.trim()" class="mt-8">
          <WeekView
            :currentDate="currentDate"
            @update:currentDate="currentDate = $event"
            @eventClicked="openEventModal"
            @eventMoved="handleEventMoved"
            :events="authStore.upcomingEvents"
            :is24HourFormat="authStore.is24HourFormat"
          />
        </div>

        <!-- Month View -->
        <div v-if="currentView === 'month' && authStore.isLoggedIn && !searchQuery.trim()" class="mt-8">
          <MonthView
            :currentDate="currentDate"
            @update:currentDate="currentDate = $event"
            @dayClicked="handleMonthDayClick"
            @eventClicked="openEventModal"
            @eventMoved="handleEventMoved"
            :events="authStore.upcomingEvents"
            :is24HourFormat="authStore.is24HourFormat"
          />
        </div>

        <!-- Todo List Section -->
        <div v-if="todoStore.todos.length > 0" class="mt-8 border-t border-border/70 pt-6">
          <h2 class="mb-4 flex items-center text-xl font-semibold text-card-foreground">
            <CheckBadgeIcon class="mr-2 h-6 w-6 text-muted-foreground" />
            My Todos
          </h2>
          <ul class="space-y-1.5">
            <li
              v-for="todo in todoStore.todos"
              :key="todo.id"
              :class="['todo-row flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200', todo.completed ? 'todo-row-completed' : '']"
            >
              <button
                class="todo-checkbox-btn flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200"
                :class="todo.completed ? 'todo-checkbox-checked' : 'todo-checkbox-unchecked'"
                @click="todoStore.toggleTodo(todo.id)"
                :aria-label="todo.completed ? 'Mark incomplete' : 'Mark complete'"
              >
                <svg v-if="todo.completed" class="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <span
                class="flex-1 text-sm font-medium transition-all duration-200"
                :class="todo.completed ? 'todo-text-done' : 'text-card-foreground'"
              >{{ todo.content }}</span>
              <button
                @click="todoStore.removeTodo(todo.id)"
                class="todo-delete-btn flex-shrink-0 rounded-full p-1 transition"
                aria-label="Delete todo"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </li>
          </ul>
        </div>
      </div>
        <div v-else class="py-12 text-center">
        <!-- <h2 class="text-xl font-semibold mb-4 dark:text-white">Welcome to Natural Agenda</h2> -->
        <p class="mb-6 text-muted-foreground">
          Please log in with your Google account to connect your calendar and see your events.
        </p>
        <button
          @click="handleLogin"
          class="agenda-create-button mx-auto flex items-center justify-center rounded-md px-6 py-3 text-white transition"
        >
          Login with Google
        </button>
        </div>
      </div>
      <div v-if="showEventModal && selectedEvent" class="event-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeEventModal">
        <div class="event-modal-card w-full max-w-lg rounded-lg border p-5 sm:p-6">
          <button
            @click="closeEventModal"
            class="modal-close-button absolute right-3 top-3 rounded-full p-1 transition"
            aria-label="Close edit modal"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
          <h3 class="text-lg font-semibold text-card-foreground">Edit event</h3>
          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="event-edit-summary">Title</label>
              <input
                id="event-edit-summary"
                v-model="editSummary"
                type="text"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Event title"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="event-edit-location">Location</label>
              <input
                id="event-edit-location"
                v-model="editLocation"
                type="text"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Location"
              />
            </div>
            <div v-if="availableCalendarsForEdit.length > 1" class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="event-edit-calendar">Calendar</label>
              <select
                id="event-edit-calendar"
                v-model="editCalendarId"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
              >
                <option v-for="cal in availableCalendarsForEdit" :key="cal.id" :value="cal.id">
                  {{ cal.summary }}
                </option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="event-edit-date">Date</label>
              <Litepicker
                id="event-edit-date"
                v-model="editDate"
                :options="singleDateLitepickerOptions"
              />
            </div>
            <label class="flex items-center gap-2 text-sm text-card-foreground">
              <input v-model="editIsAllDay" type="checkbox" class="h-4 w-4 rounded border-border/70" />
              All day
            </label>
            <div v-if="!editIsAllDay" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium text-card-foreground" for="event-edit-start-time">Start time</label>
                <input
                  id="event-edit-start-time"
                  v-model="editStartTime"
                  type="time"
                  class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-card-foreground" for="event-edit-end-time">End time</label>
                <input
                  id="event-edit-end-time"
                  v-model="editEndTime"
                  type="time"
                  class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              @click="deleteSelectedEvent"
              :disabled="isLoading"
              class="event-modal-delete rounded-md border px-4 py-2 text-sm font-medium transition"
            >
              Delete
            </button>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                @click="closeEventModal"
                :disabled="isLoading"
                class="event-modal-cancel rounded-md border px-4 py-2 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                @click="saveSelectedEvent"
                :disabled="isLoading"
                class="agenda-create-button rounded-md px-4 py-2 text-sm font-medium text-white transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showCreateHelpModal" class="event-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeCreateHelpModal">
        <div class="help-modal-card w-full max-w-2xl rounded-lg border p-5 sm:p-6">
          <button
            @click="closeCreateHelpModal"
            class="modal-close-button absolute right-3 top-3 rounded-full p-1 transition"
            aria-label="Close help modal"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
          <h3 class="text-lg font-semibold text-card-foreground">Input help</h3>
          <p class="mt-3 text-sm text-muted-foreground">
            You can type natural language in the input field. Examples:
          </p>
          <ul class="mt-3 space-y-2 text-sm text-card-foreground">
            <li><span class="font-semibold">Simple all-day:</span> <code>testitem</code> (today, all day)</li>
            <li><span class="font-semibold">Force all-day:</span> <code>testitem all day</code> or <code>testitem hele dag</code></li>
            <li><span class="font-semibold">Date + time:</span> <code>meeting tomorrow at 14:00</code></li>
            <li><span class="font-semibold">Dutch time:</span> <code>dokter vrijdag om 9u30</code></li>
            <li><span class="font-semibold">Specific date:</span> <code>birthday party 12/04 19:00</code></li>
            <li><span class="font-semibold">Todo:</span> <code>todo melk kopen</code></li>
          </ul>
          <p class="mt-4 text-sm text-muted-foreground">
            Tip: if no time is given but a date is recognized, the event is created with a default time. Use <code>all day</code> to force an all-day event.
          </p>
          <div class="mt-6 flex justify-end">
            <button
              @click="closeCreateHelpModal"
              class="event-modal-cancel rounded-md border px-4 py-2 text-sm font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      <!-- New Event Modal -->
      <div v-if="showNewEventModal" class="event-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeNewEventModal">
        <div class="event-modal-card w-full max-w-lg rounded-lg border p-5 sm:p-6">
          <button
            @click="closeNewEventModal"
            class="modal-close-button absolute right-3 top-3 rounded-full p-1 transition"
            aria-label="Close create modal"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
          <h3 class="text-lg font-semibold text-card-foreground">Nieuw event</h3>
          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="new-event-summary">Titel</label>
              <input
                id="new-event-summary"
                v-model="newEventSummary"
                type="text"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Event titel"
                autofocus
                @keyup.enter="submitNewEvent"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="new-event-location">Locatie</label>
              <input
                id="new-event-location"
                v-model="newEventLocation"
                type="text"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Locatie (optioneel)"
              />
            </div>
            <div v-if="availableCalendarsForCreate.length > 1" class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="new-event-calendar">Agenda</label>
              <select
                id="new-event-calendar"
                v-model="newEventCalendarId"
                class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
              >
                <option v-for="cal in availableCalendarsForCreate" :key="cal.id" :value="cal.id">
                  {{ cal.summary }}
                </option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-card-foreground" for="new-event-date">Datum</label>
              <Litepicker
                id="new-event-date"
                v-model="newEventDate"
                :options="singleDateLitepickerOptions"
              />
            </div>
            <label class="flex items-center gap-2 text-sm text-card-foreground">
              <input v-model="newEventIsAllDay" type="checkbox" class="h-4 w-4 rounded border-border/70" />
              Hele dag
            </label>
            <div v-if="!newEventIsAllDay" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium text-card-foreground" for="new-event-start-time">Begintijd</label>
                <input
                  id="new-event-start-time"
                  v-model="newEventStartTime"
                  type="time"
                  class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-card-foreground" for="new-event-end-time">Eindtijd</label>
                <input
                  id="new-event-end-time"
                  v-model="newEventEndTime"
                  type="time"
                  class="agenda-input w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              @click="closeNewEventModal"
              :disabled="isLoading"
              class="event-modal-cancel rounded-md border px-4 py-2 text-sm font-medium transition"
            >
              Annuleren
            </button>
            <button
              @click="submitNewEvent"
              :disabled="isLoading"
              class="agenda-create-button rounded-md px-4 py-2 text-sm font-medium text-white transition"
            >
              <span v-if="isLoading">Bezig...</span>
              <span v-else>Aanmaken</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
    </div>
  </div>
</template>

<style scoped>
.agenda-shell-panel {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.9);
  box-shadow: 0 14px 30px hsl(218 72% 20% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.18);
}

.agenda-input {
  border-color: hsl(var(--input) / 0.85);
  background-color: hsl(var(--background) / 0.25);
  color: hsl(var(--card-foreground));
}

select.agenda-input option {
  background-color: hsl(220 25% 18%);
  color: hsl(210 20% 88%);
}

.agenda-input::placeholder {
  color: hsl(var(--muted-foreground));
}

.agenda-input:focus {
  border-color: hsl(var(--ring));
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3);
}

.agenda-create-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.agenda-create-button:hover {
  filter: brightness(0.95);
}

.todo-row,
.event-row-default {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--background) / 0.2);
}

.todo-row-completed {
  border-color: hsl(156 63% 42% / 0.5);
  background-color: hsl(156 63% 42% / 0.2);
  color: hsl(var(--muted-foreground));
}

.todo-checkbox-btn {
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid hsl(var(--border));
  background-color: transparent;
  flex-shrink: 0;
}

.todo-checkbox-unchecked {
  border-color: hsl(var(--border));
}

.todo-checkbox-unchecked:hover {
  border-color: hsl(var(--primary) / 0.7);
  background-color: hsl(var(--primary) / 0.08);
}

.todo-checkbox-checked {
  border-color: hsl(156 63% 42%);
  background-color: hsl(156 63% 42%);
  color: #ffffff;
}

.todo-text-done {
  color: hsl(var(--muted-foreground));
  text-decoration: line-through;
  text-decoration-color: hsl(var(--muted-foreground) / 0.5);
}

.todo-delete-btn {
  color: hsl(var(--muted-foreground) / 0.5);
}

.todo-delete-btn:hover {
  color: hsl(var(--destructive));
  background-color: hsl(var(--destructive) / 0.1);
}

.event-row-today {
  border-color: hsl(var(--primary) / 0.7);
  background-color: hsl(var(--primary) / 0.25);
}

.event-row-success {
  border-color: hsl(156 63% 42% / 0.7);
  background-color: hsl(156 63% 42% / 0.28);
}

.event-row-all-day {
  border-style: dashed;
}

.event-all-day-label {
  border: 1px solid hsl(var(--primary) / 0.45);
  background-color: hsl(var(--primary) / 0.18);
  color: #ffffff;
}

.feedback-alert {
  line-height: 1.4;
}

.feedback-alert-success {
  border-color: hsl(156 63% 42% / 0.7);
  background-color: hsl(156 63% 42% / 0.28);
  color: hsl(var(--card-foreground));
}

.feedback-alert-error {
  border-color: hsl(var(--destructive) / 0.55);
  background-color: hsl(var(--destructive) / 0.2);
  color: hsl(var(--card-foreground));
}

.feedback-alert.event-row-today {
  color: #ffffff;
}

.event-modal-overlay {
  background-color: hsl(220 26% 9% / 0.6);
}

.event-modal-card {
  position: relative;
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.96);
  box-shadow: 0 16px 40px hsl(220 45% 8% / 0.45);
}

.event-modal-cancel {
  border-color: hsl(var(--border) / 0.7);
  color: hsl(var(--card-foreground));
}

.event-modal-cancel:hover {
  background-color: hsl(var(--secondary) / 0.5);
}

.event-modal-delete {
  background-color: hsl(var(--destructive));
  border-color: hsl(var(--destructive) / 0.5);
  color: hsl(var(--destructive-foreground));
}

.event-modal-delete:hover {
  filter: brightness(0.92);
}

.event-modal-card :deep(#event-edit-date),
.event-modal-card :deep(#new-event-date) {
  color: #ffffff;
}

.help-icon-button {
  color: hsl(var(--muted-foreground));
}

.help-icon-button:hover {
  color: hsl(var(--card-foreground));
  background-color: hsl(var(--secondary) / 0.45);
}

.help-modal-card {
  position: relative;
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.96);
  box-shadow: 0 16px 40px hsl(220 45% 8% / 0.45);
}

.modal-close-button {
  color: hsl(var(--muted-foreground));
}

.modal-close-button:hover {
  color: hsl(var(--card-foreground));
  background-color: hsl(var(--secondary) / 0.45);
}

.fetch-progress-track {
  height: 4px;
  background-color: hsl(var(--border) / 0.5);
}

.fetch-progress-bar {
  height: 4px;
  background-color: hsl(var(--primary) / 0.7);
  min-width: 8%;
}

.offline-banner {
  border-color: hsl(38 92% 50% / 0.5);
  background-color: hsl(38 92% 50% / 0.12);
  color: hsl(var(--card-foreground));
}

.notif-banner {
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--secondary) / 0.3);
}

.notif-allow-btn {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  white-space: nowrap;
}

.notif-allow-btn:hover {
  filter: brightness(0.92);
}

.mini-cal-toggle-btn {
  border-color: hsl(var(--border) / 0.65);
  color: hsl(var(--muted-foreground));
  background-color: hsl(var(--background) / 0.2);
}

.mini-cal-toggle-btn:hover {
  background-color: hsl(var(--secondary) / 0.5);
  color: hsl(var(--card-foreground));
}

.mini-cal-toggle-active {
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}
</style>
