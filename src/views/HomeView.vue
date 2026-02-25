<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import InstallButton from '@/components/InstallButton.vue'
import SettingsModal from '@/components/SettingsModal.vue' // Import SettingsModal
import WeekView from '@/components/WeekView.vue'
import MonthView from '@/components/MonthView.vue'
import TopMenu from '@/components/TopMenu.vue'
import { PlusIcon, CalendarDaysIcon, TrashIcon, CheckBadgeIcon } from '@heroicons/vue/24/solid' // Import Cog6ToothIcon, CheckBadgeIcon
import chrono from '@/services/customChrono'
import { createCalendarEvent, deleteCalendarEvent } from '@/services/googleCalendar'
import { requestAccessToken } from '@/services/gsiService'

const router = useRouter()
const authStore = useAuthStore()
const todoStore = useTodoStore() // Instantiate Todo store
const eventText = ref('')
const isLoading = ref(false)
const feedbackMessage = ref('')
const showSettingsModal = ref(false) // State for settings modal
const lastAddedEventId = ref<string | null>(null) // To highlight the last added event
const currentView = ref<'list' | 'week' | 'month'>('list') // State for current view
const currentDate = ref(new Date()) // State for current date (for week/month view navigation)
const tokenRefreshBufferMs = 30 * 1000

onMounted(() => {
  // Initial fetch is now handled by watch with { immediate: true }
})

// Fetch events whenever auth/view/date changes and user is logged in.
watch(() => [authStore.isLoggedIn, currentDate.value, currentView.value] as const, async ([isLoggedIn, newDate, newView]) => {
  if (!isLoggedIn) return;
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

function getActiveAccount() {
  return authStore.accounts.find((account) => account.id === authStore.activeAccountId)
}

async function ensureActiveAccessToken() {
  const currentAccount = getActiveAccount()
  if (!currentAccount) {
    throw new Error('No active account found.')
  }

  if (currentAccount.expiresAt > Date.now() + tokenRefreshBufferMs) {
    return currentAccount
  }

  await requestAccessToken({
    prompt: '',
    hint: currentAccount.user?.email,
  })

  const refreshedAccount = getActiveAccount()
  if (!refreshedAccount || refreshedAccount.expiresAt <= Date.now() + 5000) {
    throw new Error('Could not refresh Google session. Please log in again.')
  }

  return refreshedAccount
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

const groupedEvents = computed(() => {
  const groups: { [key: string]: any[] } = {};
  authStore.upcomingEvents.forEach(event => {
    // Use start.date for all-day events, start.dateTime for timed events
    const dateKey = (event.start.date || event.start.dateTime).split('T')[0]; // YYYY-MM-DD
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
  feedbackMessage.value = '';
  lastAddedEventId.value = null; // Clear highlight on new action

  const input = eventText.value.trim();

  // Check if it's a todo item
  if (input.toLowerCase().startsWith('todo ')) {
    const todoContent = input.substring(5).trim();
    if (todoContent) {
      todoStore.addTodo(todoContent);
      feedbackMessage.value = `✅ Todo added: "${todoContent}"`;
      eventText.value = ''; // Clear input
    } else {
      feedbackMessage.value = `❌ Error: Please provide content for the todo.`;
    }
    isLoading.value = false;
    return; // Stop here if it was a todo
  }

  // Otherwise, proceed as a calendar event
  try {
    const parsedResults = chrono.parse(input); // Use 'input' instead of 'eventText.value'
    const timeMatch = extractTimeFromInput(input);

    let summary = '';
    let startDate: Date;
    let endDate: Date;

    if (parsedResults.length === 0) {
      summary = timeMatch?.summary ?? input;
      if (!summary) {
        throw new Error("Please provide a title for the event.");
      }
      startDate = new Date();
      if (timeMatch) {
        startDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
      }
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    } else {
      const result = parsedResults[0];
      summary = input.replace(result.text, '').trim(); // Use 'input'
      if (timeMatch) {
        summary = summary.replace(timeMatch.matchText, '').replace(/\s{2,}/g, ' ').trim();
      }
      summary = summary.replace(/\b(at|om)\b\s*$/i, '').trim();

      if (!summary) {
        throw new Error("Please provide a title for the event.");
      }

      startDate = result.start.date();
      endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);
      if (timeMatch && !result.start.isCertain('hour') && !result.start.isCertain('minute')) {
        startDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
        if (!result.end || (!result.end.isCertain('hour') && !result.end.isCertain('minute'))) {
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }
      }
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const activeAccount = await ensureActiveAccessToken();
    if (!activeAccount) {
        feedbackMessage.value = `❌ Error: No active account found to create event.`;
        isLoading.value = false;
        return;
    }

    const calendarEvent = {
      summary: summary,
      start: { dateTime: startDate.toISOString(), timeZone: timeZone },
      end: { dateTime: endDate.toISOString(), timeZone: timeZone },
    };

    const createdEvent = await createCalendarEvent(activeAccount.accessToken, calendarEvent); // Assuming this returns the created event
    lastAddedEventId.value = createdEvent.id; // Store the ID for highlighting
    feedbackMessage.value = `✅ Successfully created event: "${summary}" on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !authStore.is24HourFormat })}`;
    eventText.value = ''; // Clear input
    
    // Refresh according to the currently visible range to avoid data flicker in month/week views.
    const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value)
    await authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true);

  } catch (error: any) {
    feedbackMessage.value = `❌ Error: ${error.message}`;
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

async function deleteEvent(eventId: string) {
  // Optional: Ask for confirmation
  // if (!confirm('Are you sure you want to delete this event?')) {
  //   return;
  // }

  isLoading.value = true;
  feedbackMessage.value = '';

  const activeAccount = await ensureActiveAccessToken().catch((error: any) => {
    feedbackMessage.value = `❌ Error: ${error.message}`;
    return null;
  });
  if (!activeAccount) {
    isLoading.value = false;
    return;
  }

  try {
    await deleteCalendarEvent(activeAccount.accessToken, eventId);
    feedbackMessage.value = '✅ Event successfully deleted.';
    // Refresh according to the currently visible range to avoid data flicker in month/week views.
    const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value)
    await authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true);
  } catch (error: any) {
    feedbackMessage.value = `❌ Error deleting event: ${error.message}`;
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

function handleMonthDayClick(date: Date) {
  currentDate.value = date;
  currentView.value = 'list';
}

async function manualFetchEvents() {
  if (!authStore.isLoggedIn) {
    feedbackMessage.value = '❌ Please log in to refresh events.';
    return;
  }

  const activeAccount = await ensureActiveAccessToken().catch((error: any) => {
    feedbackMessage.value = `❌ Error: ${error.message}`;
    return null;
  });
  if (!activeAccount) {
    return;
  }

  const { fetchStart, fetchEnd } = getFetchRangeForView(currentView.value, currentDate.value);
  authStore.fetchUpcomingEvents(fetchStart, fetchEnd, true);
  feedbackMessage.value = '✅ Events refreshed.';
}

function isEventToday(event: any): boolean {
  const eventDateStr = (event.start.date || event.start.dateTime).split('T')[0];
  
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
    feedbackMessage.value = `❌ Error: ${error.message}`;
  });
}

function handleViewSwitch(view: string) {
  if (view === 'year') {
    router.push('/year')
  } else {
    currentView.value = view as 'list' | 'week' | 'month'
  }
}
</script>

<template>
  <div class="year-weather-theme page-container mx-auto max-w-7xl p-4 pt-28 sm:p-6 sm:pt-32 lg:p-8 lg:pt-32">
    <TopMenu 
      :currentView="currentView" 
      :showSettings="true" 
      :showRefresh="true" 
      @update:view="handleViewSwitch" 
      @refresh="manualFetchEvents" 
      @openSettings="showSettingsModal = true" 
    />

    <div class="agenda-shell-panel rounded-lg border p-6 sm:p-7">


      <div v-if="authStore.isLoggedIn" class="mt-6 border-t border-border/70 pt-6">
        <!-- Todo List Section -->
        <div v-if="todoStore.todos.length > 0" class="mb-8">
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
        
        <h2 class="mb-4 text-xl font-semibold text-card-foreground">Create a new event</h2>
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
        <div v-if="feedbackMessage" class="mt-4 text-sm" :class="feedbackMessage.includes('Error') ? 'text-red-200' : 'text-emerald-200'">
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
                    'event-row flex items-center justify-between space-x-2 rounded-md border p-2 text-sm transition-all duration-200',
                    event.id === lastAddedEventId
                      ? 'event-row-success shadow'
                      : isEventToday(event)
                        ? 'event-row-today'
                        : 'event-row-default'
                  ]"
                >
                  <div class="flex items-start space-x-2">
                    <p class="w-16 flex-shrink-0 text-xs font-medium text-muted-foreground">
                      {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : 'All day' }}
                    </p>
                    <p class="text-sm font-semibold text-card-foreground">{{ event.summary }}</p>
                  </div>
                  <button @click="deleteEvent(event.id)" :disabled="isLoading" class="rounded-full p-1 text-muted-foreground transition hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" aria-label="Delete event">
                    <TrashIcon class="h-5 w-5" />
                  </button>
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
          <WeekView :currentDate="currentDate" @update:currentDate="currentDate = $event" :events="authStore.upcomingEvents" :is24HourFormat="authStore.is24HourFormat" />
        </div>

        <!-- Month View -->
        <div v-if="currentView === 'month' && authStore.isLoggedIn" class="mt-8">
          <MonthView :currentDate="currentDate" @update:currentDate="currentDate = $event" @dayClicked="handleMonthDayClick" :events="authStore.upcomingEvents" :is24HourFormat="authStore.is24HourFormat" />
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
    <InstallButton />

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
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
</style>
