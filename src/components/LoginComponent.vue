<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// IMPORTANT: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = '350064938484-i5mqo80eieq2e966i10kus824r4p7pmc.apps.googleusercontent.com'

let tokenClient: google.accounts.oauth2.TokenClient | undefined;

// Function to initialize the Google GIS client
function initializeGsi() {
  return new Promise<void>((resolve, reject) => {
    try {
      if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              authStore.setToken(tokenResponse.access_token)
              // Fetch user profile
              const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  'Authorization': `Bearer ${tokenResponse.access_token}`
                }
              });
              const userinfo = await response.json();
              authStore.setUser(userinfo);
              // Fetch upcoming events after login
              await authStore.fetchUpcomingEvents();
            }
          },
        });
        resolve();
      } else {
        reject(new Error("Google GSI script not loaded."));
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function handleLogin() {
  const checkAndInitialize = () => {
    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        if (window.google) {
          clearInterval(interval);
          try {
            await initializeGsi();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          attempts++;
          if (attempts > 20) { // Stop after 10 seconds
            clearInterval(interval);
            reject(new Error("Failed to load Google's authentication script. Please check your connection and try again."));
          }
        }
      }, 500);
    });
  };

  try {
    if (!tokenClient) {
      await checkAndInitialize();
    }
    tokenClient?.requestAccessToken();
  } catch (error) {
    console.error(error);
    // You could show this error to the user in the UI
    alert((error as Error).message);
  }
}


</script>

<template>
  <div class="p-4">
    <div v-if="!authStore.isLoggedIn">
      <button @click="handleLogin" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        Login with Google
      </button>
       <p class="text-sm text-gray-500 dark:text-gray-300 mt-2">
        You need to login to connect your Google Calendar.
      </p>
    </div>
  </div>
</template>
