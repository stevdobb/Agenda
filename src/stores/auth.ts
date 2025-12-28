import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUpcomingEvents } from '@/services/googleCalendar'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<any>(null)
  const isLoggedIn = ref(false)
  const upcomingEvents = ref<any[]>([])
  const isDarkMode = ref(false)

  function checkDarkMode() {
    if (localStorage.theme === 'light') {
      document.documentElement.classList.remove('dark')
      isDarkMode.value = false
    } else if (localStorage.theme === 'dark') {
      document.documentElement.classList.add('dark')
      isDarkMode.value = true
    } else {
      // Default to dark mode if no theme is set
      localStorage.theme = 'dark'
      document.documentElement.classList.add('dark')
      isDarkMode.value = true
    }
  }

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    if (isDarkMode.value) {
      localStorage.theme = 'dark'
      document.documentElement.classList.add('dark')
    } else {
      localStorage.theme = 'light'
      document.documentElement.classList.remove('dark')
    }
  }

  async function fetchUpcomingEvents() {
    try {
      const events = await getUpcomingEvents();
      upcomingEvents.value = events;
    } catch (error) {
      console.error("Failed to fetch upcoming events:", error);
      // Optionally, clear events or set an error state
      upcomingEvents.value = [];
    }
  }

  function setToken(token: string) {
    accessToken.value = token
    isLoggedIn.value = true
    // For persistence, you might save the token to localStorage
    localStorage.setItem('google_access_token', token)
  }

  function setUser(userData: any) {
    user.value = userData
    localStorage.setItem('google_user', JSON.stringify(userData))
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
    isLoggedIn.value = false
    upcomingEvents.value = [] // Clear events on logout
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_user')
  }

  function checkAuth() {
    const token = localStorage.getItem('google_access_token')
    const userData = localStorage.getItem('google_user')
    if (token && userData) {
      accessToken.value = token
      user.value = JSON.parse(userData)
      isLoggedIn.value = true
    }
  }

  return {
    accessToken,
    user,
    isLoggedIn,
    upcomingEvents,
    fetchUpcomingEvents,
    setToken,
    setUser,
    clearAuth,
    checkAuth,
    isDarkMode,
    checkDarkMode,
    toggleDarkMode,
  }
})
