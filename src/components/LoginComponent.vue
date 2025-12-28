<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// IMPORTANT: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = '350064938484-i5mqo80eieq2e966i10kus824r4p7pmc.apps.googleusercontent.com'

let tokenClient: google.accounts.oauth2.TokenClient;

onMounted(() => {
  // Load the GIS client
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
        }
      },
    });
  }
})

function handleLogin() {
  tokenClient.requestAccessToken();
}

function handleLogout() {
  authStore.clearAuth()
}
</script>

<template>
  <div class="p-4">
    <div v-if="authStore.isLoggedIn && authStore.user" class="flex items-center space-x-4">
      <img :src="authStore.user.picture" alt="User profile" class="w-10 h-10 rounded-full">
      <div>
        <p class="font-semibold">{{ authStore.user.name }}</p>
        <p class="text-sm text-gray-600">{{ authStore.user.email }}</p>
      </div>
      <button @click="handleLogout" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
        Logout
      </button>
    </div>
    <div v-else>
      <button @click="handleLogin" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        Login with Google
      </button>
       <p class="text-sm text-gray-500 mt-2">
        You need to login to connect your Google Calendar.
      </p>
      
    </div>
  </div>
</template>
