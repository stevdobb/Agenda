<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import InstallButton from '@/components/InstallButton.vue'
import SettingsModal from '@/components/SettingsModal.vue' // Import SettingsModal
import WeekView from '@/components/WeekView.vue'
import MonthView from '@/components/MonthView.vue'
import { PlusIcon, CalendarDaysIcon, TrashIcon, Cog6ToothIcon, CheckBadgeIcon } from '@heroicons/vue/24/solid' // Import Cog6ToothIcon, CheckBadgeIcon
import chrono from '@/services/customChrono'
import { createCalendarEvent, deleteCalendarEvent } from '@/services/googleCalendar'

const authStore = useAuthStore()
const todoStore = useTodoStore() // Instantiate Todo store
const eventText = ref('')
const isLoading = ref(false)
const feedbackMessage = ref('')
const showSettingsModal = ref(false) // State for settings modal
const lastAddedEventId = ref<string | null>(null) // To highlight the last added event
const currentView = ref<'list' | 'week' | 'month'>('list') // State for current view
const currentDate = ref(new Date()) // State for current date (for week/month view navigation)

onMounted(() => {
  // Initial fetch is now handled by watch with { immediate: true }
})

// Watch for changes in currentDate and refetch events
watch(() => [currentDate.value, currentView.value] as const, async ([newDate, newView], oldValues) => {
  const [oldDate, oldView] = oldValues || [undefined, undefined];
  if (!authStore.isLoggedIn) return; // Only fetch if logged in

  // Determine if a re-fetch is necessary
  const shouldRefetch = !oldDate || newView !== oldView || // View changed
                       (newDate instanceof Date && oldDate instanceof Date && (
                         newDate.getMonth() !== oldDate.getMonth() || // Month changed
                         newDate.getFullYear() !== oldDate.getFullYear() // Year changed
                       ))

  if (!shouldRefetch && authStore.fetchRangeStart && authStore.fetchRangeEnd) {
    // If not a significant date change or view change, check if the current date is within the fetched range
    const isWithinRange = newDate >= authStore.fetchRangeStart && newDate <= authStore.fetchRangeEnd;
    if (isWithinRange) {
      return; // No need to re-fetch if within current fetched range
    }
  }

  // Determine the range to fetch based on the current view
  let fetchStart: Date;
  let fetchEnd: Date;

  const today = new Date(); // Use today for default list view range

  if (newView === 'list') {
    // Fetch events from today onwards for one year
    fetchStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    fetchStart.setHours(0, 0, 0, 0); // Start of today

    fetchEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()); // One year from today
  } else if (newView === 'week') {
    // Fetch events for the current week + a buffer of 2 weeks on each side
    const startOfWeek = new Date(newDate);
    startOfWeek.setDate(newDate.getDate() - newDate.getDay() + (newDate.getDay() === 0 ? -6 : 1)); // Start of week (Monday)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Sunday)
    endOfWeek.setHours(23, 59, 59, 999);

    fetchStart = new Date(startOfWeek);
    fetchStart.setDate(startOfWeek.getDate() - 7 * 2); // 2 weeks before
    fetchEnd = new Date(endOfWeek);
    fetchEnd.setDate(endOfWeek.getDate() + 7 * 2); // 2 weeks after

  } else if (newView === 'month') {
    // Fetch events for the current month + a buffer of 1 month on each side
    const startOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    fetchStart = new Date(startOfMonth);
    fetchStart.setMonth(startOfMonth.getMonth() - 1); // 1 month before
    fetchEnd = new Date(endOfMonth);
    fetchEnd.setMonth(endOfMonth.getMonth() + 1); // 1 month after
    fetchEnd.setDate(0); // Set to last day of next month

  } else {
    // Fallback for unknown view, use default list range
    fetchStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    fetchEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  }
  
  await authStore.fetchUpcomingEvents(fetchStart, fetchEnd);
}, { immediate: true }) // immediate: true to run on initial mount as well


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
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
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
  const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
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
    if (parsedResults.length === 0) {
      throw new Error("I couldn't understand the date and time. Please be more specific.");
    }

    const result = parsedResults[0];
    const summary = input.replace(result.text, '').trim(); // Use 'input'

    if (!summary) {
      throw new Error("Please provide a title for the event.");
    }

    const startDate = result.start.date();
    const endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const calendarEvent = {
      summary: summary,
      start: { dateTime: startDate.toISOString(), timeZone: timeZone },
      end: { dateTime: endDate.toISOString(), timeZone: timeZone },
    };

    const createdEvent = await createCalendarEvent(calendarEvent); // Assuming this returns the created event
    lastAddedEventId.value = createdEvent.id; // Store the ID for highlighting
    feedbackMessage.value = `✅ Successfully created event: "${summary}" on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !authStore.is24HourFormat })}`;
    eventText.value = ''; // Clear input
    
    // Refresh the upcoming events list
    await authStore.fetchUpcomingEvents();

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

  try {
    await deleteCalendarEvent(eventId);
    feedbackMessage.value = '✅ Event successfully deleted.';
    // Refresh the event list
    await authStore.fetchUpcomingEvents();
  } catch (error: any) {
    feedbackMessage.value = `❌ Error deleting event: ${error.message}`;
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto p-3 sm:p-3 lg:max-w-7xl xl:max-w-full">
    <header class="text-center my-8 relative">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Natural Agenda</h1>
      
      <!-- Settings Button -->
      <button @click="showSettingsModal = true" class="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <Cog6ToothIcon class="h-6 w-6" />
      </button>

      <!-- View Switcher -->
      <div class="flex justify-center space-x-2 mb-4 mt-5">
        <button @click="currentView = 'list'" :class="{'bg-blue-500 text-white': currentView === 'list', 'bg-gray-200 dark:bg-gray-700': currentView !== 'list'}" class="px-3 py-1 rounded-md transition">List</button>
        <button @click="currentView = 'week'" :class="{'bg-blue-500 text-white': currentView === 'week', 'bg-gray-200 dark:bg-gray-700': currentView !== 'week'}" class="px-3 py-1 rounded-md transition">Week</button>
        <button @click="currentView = 'month'" :class="{'bg-blue-500 text-white': currentView === 'month', 'bg-gray-200 dark:bg-gray-700': currentView !== 'month'}" class="px-3 py-1 rounded-md transition">Month</button>
      </div>
    </header>

    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">


      <div v-if="authStore.isLoggedIn" class="mt-6 border-t dark:border-gray-700 pt-6">
        <!-- Todo List Section -->
        <div v-if="todoStore.todos.length > 0" class="mb-8">
          <h2 class="text-xl font-semibold mb-4 flex items-center dark:text-white">
            <CheckBadgeIcon class="h-6 w-6 mr-2 text-gray-700 dark:text-gray-300" />
            My Todos
          </h2>
          <ul class="space-y-2">
            <li v-for="todo in todoStore.todos" :key="todo.id"
                :class="['p-3 rounded-md border flex items-center justify-between space-x-3',
                         todo.completed ? 'bg-green-50 dark:bg-green-700 border-green-200 dark:border-green-600 line-through text-gray-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600']">
              <div class="flex items-center space-x-3">
                <input type="checkbox" :checked="todo.completed" @change="todoStore.toggleTodo(todo.id)" class="form-checkbox h-5 w-5 text-blue-600">
                <span class="font-medium text-gray-800 dark:text-white">{{ todo.content }}</span>
              </div>
              <button @click="todoStore.removeTodo(todo.id)" class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-700">
                <TrashIcon class="h-5 w-5" />
              </button>
            </li>
          </ul>
        </div>
        
        <h2 class="text-xl font-semibold mb-4 dark:text-white">Create a new event</h2>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
          autofocus
            v-model="eventText"
            @keyup.enter="createEvent"
            type="text"
            placeholder="e.g., Meeting with John tomorrow at 2pm"
            class="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          />
          <button
            @click="createEvent"
            :disabled="isLoading"
            class="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center transition w-full sm:w-16 mt-2 sm:mt-0"
            aria-label="Create Event"
          >
             <svg v-if="isLoading" class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <PlusIcon v-else class="h-6 w-6" />
          </button>
        </div>
        <div v-if="feedbackMessage" class="mt-4 text-sm" :class="feedbackMessage.includes('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
          {{ feedbackMessage }}
        </div>

        <!-- List View -->
        <div v-if="currentView === 'list'" class="mt-8 border-t dark:border-gray-700 pt-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center dark:text-white">
            <CalendarDaysIcon class="h-6 w-6 mr-2 text-gray-700 dark:text-gray-300" />
            Upcoming Events
          </h2>
          <div v-if="groupedEvents.length > 0" class="space-y-6">
            <div v-for="dayGroup in groupedEvents" :key="dayGroup.date" class="space-y-3">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">
                {{ formatDayHeader(dayGroup.date) }}
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="event in dayGroup.events"
                  :key="event.id"
                  :class="[
                    'p-3 rounded-md border flex items-center justify-between space-x-3 transition-all duration-300',
                    event.id === lastAddedEventId
                      ? 'bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600 shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  ]"
                >
                  <div class="flex items-start space-x-3">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 flex-shrink-0">
                      {{ event.start.dateTime ? formatEventTime(event.start.dateTime) : 'All day' }}
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-white">{{ event.summary }}</p>
                  </div>
                  <button @click="deleteEvent(event.id)" :disabled="isLoading" class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-700" aria-label="Delete event">
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div v-else class="text-center text-gray-500 dark:text-gray-400 p-4 border-2 border-dashed rounded-md dark:border-gray-600">
            <p>No upcoming events found.</p>
          </div>
        </div>
        <!-- Week View -->
        <div v-if="currentView === 'week' && authStore.isLoggedIn" class="mt-8">
          <WeekView :currentDate="currentDate" @update:currentDate="currentDate = $event" :events="authStore.upcomingEvents" :is24HourFormat="authStore.is24HourFormat" />
        </div>

        <!-- Month View -->
        <div v-if="currentView === 'month' && authStore.isLoggedIn" class="mt-8">
          <MonthView :currentDate="currentDate" @update:currentDate="currentDate = $event" :events="authStore.upcomingEvents" :is24HourFormat="authStore.is24HourFormat" />
        </div>
      </div>
    </div>
    <InstallButton />

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
  </div>
</template>
