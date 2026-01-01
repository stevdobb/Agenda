<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import InstallButton from '@/components/InstallButton.vue'
import SettingsModal from '@/components/SettingsModal.vue' // Import SettingsModal
import EventEditor from '@/components/EventEditor.vue'
import EventList from '@/components/EventList.vue'
import WeekView from '@/components/WeekView.vue'
import MonthView from '@/components/MonthView.vue'
import { CalendarDaysIcon, TrashIcon, Cog6ToothIcon, CheckBadgeIcon } from '@heroicons/vue/24/solid' // Import Cog6ToothIcon, CheckBadgeIcon
import { requestAccessToken } from '@/services/gsiService'
import { useCalendarStore, type CalendarEvent } from '@/stores/calendar' // Import CalendarEvent type

const authStore = useAuthStore()
const todoStore = useTodoStore() // Instantiate Todo store
const calendarStore = useCalendarStore() // Instantiate Calendar store

const showSettingsModal = ref(false) // State for settings modal
const currentView = ref<'list' | 'week' | 'month'>('list') // State for current view
const currentDate = ref(new Date()) // State for current date (for week/month view navigation)
const showEventEditor = ref(false) // Control visibility of EventEditor
const editingEvent = ref<CalendarEvent | null>(null) // Holds event data for editing

onMounted(() => {
  // Initial fetch is now handled by watch with { immediate: true }
})

// Watch for changes in currentDate and refetch events
watch(() => [authStore.isLoggedIn, currentDate.value, currentView.value] as const, async ([isLoggedIn, newDate, newView], oldValues) => {
  const [wasLoggedIn] = oldValues || [false];
  if (!isLoggedIn) return;

  // Initial login fetches a wide range, subsequent view/date changes fetch specific ranges
  if (wasLoggedIn) {
    const { fetchStart, fetchEnd } = getFetchRangeForView(newView, newDate);
    await authStore.fetchUpcomingEvents(fetchStart, fetchEnd);
  }
}, { immediate: true })


function getFetchRangeForView(view: 'list' | 'week' | 'month', date: Date) {
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
  } else { // month view
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    fetchStart = new Date(startOfMonth);
    fetchStart.setMonth(startOfMonth.getMonth() - 1);
    fetchEnd = new Date(date.getFullYear(), date.getMonth() + 2, 0);
  }
  return { fetchStart, fetchEnd };
}

// New function to handle save/update from EventEditor
async function handleSaveEvent(eventData: CalendarEvent | Omit<CalendarEvent, 'id'>) {
  try {
    if ('id' in eventData && eventData.id) {
      calendarStore.updateEvent(eventData as CalendarEvent)
    } else {
      calendarStore.addEvent(eventData as Omit<CalendarEvent, 'id'>)
    }
    
    // Refresh the upcoming events list
    await authStore.fetchUpcomingEvents(undefined, undefined, true)

    // Reset editor state
    showEventEditor.value = false
    editingEvent.value = null

  } catch (error: any) {
    console.error(error)
  }
}

// Function to handle edit event from EventList
function handleEditEvent(eventId: string) {
  const eventToEdit = calendarStore.events.find(event => event.id === eventId)
  if (eventToEdit) {
    editingEvent.value = eventToEdit
    showEventEditor.value = true
  }
}

async function createEvent() {
  editingEvent.value = null
  showEventEditor.value = true
}

async function deleteEvent(eventId: string) {
  // Attempt to remove from local store first
  calendarStore.removeEvent(eventId)
  // For now, I am commenting out the google calendar deletion part to prevent unintended data loss.
  /*
  const activeAccount = authStore.accounts.find(acc => acc.id === authStore.activeAccountId)
  if (activeAccount) {
    try {
      await deleteCalendarEvent(activeAccount.accessToken, eventId); // eventId here needs to be the Google Calendar event ID
    } catch (error: any) {
      console.error(error);
    }
  }
  */
  await authStore.fetchUpcomingEvents(undefined, undefined, true);
}


function handleMonthDayClick(date: Date) {
  currentDate.value = date;
  currentView.value = 'list';
}

function manualFetchEvents() {
  if (!authStore.isLoggedIn) {
    return;
  }
  const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value);
  authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true);
}

function handleLogin() {
  requestAccessToken();
}
