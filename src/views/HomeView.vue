<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import LoginComponent from '@/components/LoginComponent.vue'
import { PlusIcon } from '@heroicons/vue/24/solid'
import * as chrono from 'chrono-node'
import { createCalendarEvent } from '@/services/googleCalendar'

const authStore = useAuthStore()
const eventText = ref('')
const isLoading = ref(false)
const feedbackMessage = ref('')

async function createEvent() {
  if (!eventText.value.trim() || isLoading.value) return;

  isLoading.value = true;
  feedbackMessage.value = '';

  try {
    const parsedResults = chrono.parse(eventText.value);
    if (parsedResults.length === 0) {
      throw new Error("I couldn't understand the date and time. Please be more specific.");
    }

    const result = parsedResults[0];
    const summary = result.text;
    const startDate = result.start.date();

    // Default to a 1-hour event if no end time is parsed
    const endDate = result.end ? result.end.date() : new Date(startDate.getTime() + 60 * 60 * 1000);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const calendarEvent = {
      summary: summary,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timeZone,
      },
    };

    await createCalendarEvent(calendarEvent);

    feedbackMessage.value = `✅ Successfully created event: "${summary}"`;
    eventText.value = ''; // Clear input on success

  } catch (error: any) {
    feedbackMessage.value = `❌ Error: ${error.message}`;
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 sm:p-6 lg:p-8">
    <header class="text-center my-8">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900">Agenda Adder</h1>
      <p class="mt-2 text-lg text-gray-600">Add events to your Google Calendar using natural language.</p>
    </header>

    <div class="bg-white shadow-md rounded-lg p-6">
      <LoginComponent />

      <div v-if="authStore.isLoggedIn" class="mt-6 border-t pt-6">
        <h2 class="text-xl font-semibold mb-4">Create a new event</h2>
        <div class="flex items-center space-x-2">
          <input
            v-model="eventText"
            @keyup.enter="createEvent"
            type="text"
            placeholder="e.g., Meeting with John tomorrow at 2pm"
            class="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            @click="createEvent"
            :disabled="isLoading"
            class="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center transition w-16"
            aria-label="Create Event"
          >
            <svg v-if="isLoading" class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <PlusIcon v-else class="h-6 w-6" />
          </button>
        </div>
        <div v-if="feedbackMessage" class="mt-4 text-sm" :class="feedbackMessage.includes('Error') ? 'text-red-600' : 'text-green-600'">
          {{ feedbackMessage }}
        </div>
      </div>
    </div>
  </div>
</template>
