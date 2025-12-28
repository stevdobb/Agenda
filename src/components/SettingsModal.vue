<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { XMarkIcon, SunIcon, MoonIcon, ClockIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/vue/24/solid'

const authStore = useAuthStore()

const emit = defineEmits(['close'])

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
          prompt: 'consent', // Request consent for offline access
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token && tokenResponse.expires_in) {
              authStore.setToken(tokenResponse.access_token, Number(tokenResponse.expires_in))
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

const close = () => {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
    <div class="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold">Settings</h3>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Dark Mode Toggle -->
        <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center">
            <MoonIcon v-if="authStore.isDarkMode" class="h-5 w-5 mr-2 text-yellow-400" />
            <SunIcon v-else class="h-5 w-5 mr-2 text-orange-400" />
            <span>Dark Mode</span>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="authStore.isDarkMode" @change="authStore.toggleDarkMode" />
            <span class="slider round"></span>
          </label>
        </div>

        <!-- 24-hour Format Toggle -->
        <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700">
          <div class="flex items-center">
            <ClockIcon class="h-5 w-5 mr-2 text-blue-400" />
            <span>24-hour Format</span>
          </div>
          <label class="switch">
            <input type="checkbox" :checked="authStore.is24HourFormat" @change="authStore.toggle24HourFormat" />
            <span class="slider round"></span>
          </label>
        </div>

        <!-- Login/Logout Section -->
        <div class="pt-4 border-t dark:border-gray-700">
          <div v-if="authStore.isLoggedIn" class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Logged in as: <span class="font-semibold">{{ authStore.user?.name || authStore.user?.email }}</span>
            </p>
            <button @click="authStore.clearAuth()" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center mx-auto">
              <ArrowRightEndOnRectangleIcon class="h-5 w-5 mr-2" /> Logout
            </button>
          </div>
          <div v-else class="text-center">
            <button @click="handleLogin" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center mx-auto">
              Login with Google
            </button>
             <p class="text-sm text-gray-500 dark:text-gray-300 mt-2">
              You need to login to connect your Google Calendar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
}
input:checked + .slider {
  background-color: #2196F3;
}
input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}
input:checked + .slider:before {
  transform: translateX(20px);
}
/* Rounded sliders */
.slider.round {
  border-radius: 20px;
}
.slider.round:before {
  border-radius: 50%;
}
</style>
