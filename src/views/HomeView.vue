<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import SettingsModal from '@/components/SettingsModal.vue' // Import SettingsModal
import WeekView from '@/components/WeekView.vue'
import MonthView from '@/components/MonthView.vue'
import Litepicker from '@/components/Litepicker.vue'
import TopMenu from '@/components/TopMenu.vue'
import { PlusIcon, CalendarDaysIcon, TrashIcon, CheckBadgeIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/solid' // Import Cog6ToothIcon, CheckBadgeIcon
import chrono from '@/services/customChrono'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '@/services/googleCalendar'
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
const selectedEvent = ref<GoogleCalendarEvent | null>(null)
const editSummary = ref('')
const editDate = ref('')
const editStartTime = ref('09:00')
const editEndTime = ref('10:00')
const editIsAllDay = ref(false)
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
  const today = new Date();

  if (view === 'list') {
    fetchStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    fetchStart.setHours(0, 0, 0, 0);
    fetchEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
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

function getCreatedEventFeedback(summary: string, startDate: Date) {
  const formattedTime = formatAddedTime(startDate)
  if (isSameLocalDay(startDate, new Date())) {
    return {
      message: `Added today at ${formattedTime}: "${summary}"`,
      useTodayStyle: true,
    }
  }

  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return {
    message: `Added for ${formattedDate} at ${formattedTime}: "${summary}"`,
    useTodayStyle: false,
  }
}

function getCreatedAllDayEventFeedback(summary: string, startDate: Date) {
  if (isSameLocalDay(startDate, new Date())) {
    return {
      message: `Added all-day for today: "${summary}"`,
      useTodayStyle: true,
    }
  }

  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return {
    message: `Added all-day for ${formattedDate}: "${summary}"`,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);

    const filteredGroups: { date: string; events: any[] }[] = [];
    groupedEvents.value.forEach(dayGroup => {
      // Create date from YYYY-MM-DD string, ensuring it's treated as local time midnight
      const parts = dayGroup.date.split('-').map(part => parseInt(part, 10));
      const groupDate = new Date(parts[0], parts[1] - 1, parts[2]);

      if (groupDate >= today && groupDate <= sevenDaysLater) {
        filteredGroups.push(dayGroup);
      }
    });
    return filteredGroups;
  }
  // For other views (week, month), we want to show all events that were fetched
  // as the WeekView and MonthView components will handle their own filtering/display logic.
  return groupedEvents.value;
});

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
    const forceAllDay = /\b(all[\s-]?day|hele\s+dag)\b/i.test(input)
    const normalizedInput = input
      .replace(/\b(all[\s-]?day|hele\s+dag)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    const parsedResults = chrono.parse(normalizedInput)
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
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
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
        endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);
        if (timeMatch && !result.start.isCertain('hour') && !result.start.isCertain('minute')) {
          startDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
          if (!result.end || (!result.end.isCertain('hour') && !result.end.isCertain('minute'))) {
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          }
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
        }
      : {
          summary,
          start: { dateTime: startDate!.toISOString(), timeZone },
          end: { dateTime: endDate!.toISOString(), timeZone },
        };

    const createdEvent = await createCalendarEvent(activeAccount.accessToken, calendarEvent); // Assuming this returns the created event
    lastAddedEventId.value = createdEvent.id; // Store the ID for highlighting
    const createdFeedback = allDayStartDate
      ? getCreatedAllDayEventFeedback(summary, parseDateKey(allDayStartDate) ?? new Date())
      : getCreatedEventFeedback(summary, startDate!)
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

    await updateCalendarEvent(account.accessToken, eventToUpdate.id, payload)
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
    await deleteCalendarEvent(account.accessToken, event.id)
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
</script>

<template>
  <div class="year-weather-theme">
    <div class="page-container mx-auto max-w-7xl px-4 pt-28 pb-4 sm:px-6 sm:pt-32 sm:pb-6 lg:px-8 lg:pt-32 lg:pb-8">
      <TopMenu 
        :currentView="currentView" 
        :showSettings="true" 
        :showRefresh="true" 
        @update:view="handleViewSwitch" 
        @refresh="manualFetchEvents" 
        @openSettings="handleOpenSettings" 
      />

      <div class="agenda-shell-panel rounded-lg border p-6 sm:p-7">


        <div v-if="authStore.isLoggedIn" class="mt-3">
        <div class="mb-4 flex items-center gap-2">
          <h2 class="text-xl font-semibold text-card-foreground">Create a new event</h2>
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

        <!-- List View -->
        <div v-if="currentView === 'list'" class="mt-8 border-t border-border/70 pt-6">
          <h2 class="mb-4 flex items-center text-xl font-semibold text-card-foreground">
            <CalendarDaysIcon class="mr-2 h-6 w-6 text-muted-foreground" />
            Upcoming Events
          </h2>
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
                    'event-row flex cursor-pointer items-center justify-between space-x-2 rounded-md border p-2 text-sm transition-all duration-200',
                    isAllDayEvent(event) ? 'event-row-all-day' : '',
                    event.id === lastAddedEventId
                      ? 'event-row-success shadow'
                      : isEventToday(event)
                        ? 'event-row-today'
                        : 'event-row-default'
                  ]"
                  @click="openEventModal(event)"
                >
                  <div class="flex items-start space-x-2">
                    <p v-if="isAllDayEvent(event)" class="event-all-day-label flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold">
                      All day
                    </p>
                    <p v-else class="w-16 flex-shrink-0 text-xs font-medium text-muted-foreground">
                      {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : 'All day' }}
                    </p>
                    <p class="text-sm font-semibold text-card-foreground">{{ event.summary }}</p>
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
        <div v-if="currentView === 'week' && authStore.isLoggedIn" class="mt-8">
          <WeekView
            :currentDate="currentDate"
            @update:currentDate="currentDate = $event"
            @eventClicked="openEventModal"
            :events="authStore.upcomingEvents"
            :is24HourFormat="authStore.is24HourFormat"
          />
        </div>

        <!-- Month View -->
        <div v-if="currentView === 'month' && authStore.isLoggedIn" class="mt-8">
          <MonthView
            :currentDate="currentDate"
            @update:currentDate="currentDate = $event"
            @dayClicked="handleMonthDayClick"
            @eventClicked="openEventModal"
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
          <ul class="space-y-2">
            <li v-for="todo in todoStore.todos" :key="todo.id"
                :class="['todo-row flex items-center justify-between space-x-3 rounded-md border p-3', todo.completed ? 'todo-row-completed line-through' : '']">
              <div class="flex items-center space-x-3">
                <input type="checkbox" :checked="todo.completed" @change="todoStore.toggleTodo(todo.id)" class="form-checkbox h-5 w-5 text-blue-600">
                <span class="font-medium text-card-foreground">{{ todo.content }}</span>
              </div>
              <button @click="todoStore.removeTodo(todo.id)" class="rounded-full p-1 text-muted-foreground transition hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <TrashIcon class="h-5 w-5" />
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

.event-modal-card :deep(#event-edit-date) {
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
  border-color: hsl(var(--border) / 0.6);
  background-color: hsl(var(--card) / 0.96);
  box-shadow: 0 16px 40px hsl(220 45% 8% / 0.45);
}
</style>
