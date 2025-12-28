import { defineStore } from 'pinia'
import { ref } from 'vue'
import { computed } from 'vue'
import { getUpcomingEvents } from '@/services/googleCalendar'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const expiresAt = ref<number | null>(null) // New ref for token expiration timestamp
  const user = ref<any>(null)
  const isLoggedIn = ref(false)
  const upcomingEvents = ref<any[]>([])
  const isDarkMode = ref(false)
  const is24HourFormat = ref(true) // Default to 24-hour format
  const fetchRangeStart = ref<Date | null>(null) // Start of the currently fetched event range
  const fetchRangeEnd = ref<Date | null>(null) // End of the currently fetched event range

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

  function toggle24HourFormat() {
    is24HourFormat.value = !is24HourFormat.value
    localStorage.setItem('24_hour_format', JSON.stringify(is24HourFormat.value))
  }

  async function fetchUpcomingEvents(startDate?: Date, endDate?: Date) {
    if (!accessToken.value) {
      console.warn("Attempted to fetch events without access token.");
      upcomingEvents.value = [];
      return;
    }

    try {
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      if (!effectiveStartDate || !effectiveEndDate) {
        // Default range: 1 month before current date to 2 months after
        const today = new Date();
        effectiveStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Start of previous month
        effectiveEndDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);   // End of month after next
      }

      // Ensure dates are ISO strings
      const timeMin = effectiveStartDate.toISOString();
      const timeMax = effectiveEndDate.toISOString();

      const events = await getUpcomingEvents(timeMin, timeMax);
      upcomingEvents.value = events;
      fetchRangeStart.value = effectiveStartDate;
      fetchRangeEnd.value = effectiveEndDate;
    } catch (error) {
      console.error("Failed to fetch upcoming events:", error);
      upcomingEvents.value = [];
      fetchRangeStart.value = null;
      fetchRangeEnd.value = null;
    }
  }

  function setToken(token: string, expires_in: number) {
    accessToken.value = token
    expiresAt.value = Date.now() + expires_in * 1000 // Convert expires_in to absolute timestamp
    isLoggedIn.value = true

    localStorage.setItem('google_access_token', token)
    localStorage.setItem('google_expires_at', String(expiresAt.value))
  }

  function setUser(userData: any) {
    user.value = userData
    localStorage.setItem('google_user', JSON.stringify(userData))
  }

  function clearAuth() {
    accessToken.value = null
    expiresAt.value = null // Clear expiration timestamp
    user.value = null
    isLoggedIn.value = false
    upcomingEvents.value = [] // Clear events on logout
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_expires_at') // Clear expiration timestamp from localStorage
    localStorage.removeItem('google_user')
    localStorage.removeItem('24_hour_format') // Clear time format preference
  }

  async function checkAuth() {
    const token = localStorage.getItem('google_access_token')
    const expires = localStorage.getItem('google_expires_at') // Load expiration timestamp
    const userData = localStorage.getItem('google_user')
    const format24Hour = localStorage.getItem('24_hour_format')

    if (token && userData && expires) { // Check if expires is also present
      accessToken.value = token
      expiresAt.value = Number(expires) // Set expiration timestamp
      user.value = JSON.parse(userData)
      isLoggedIn.value = true
    } else {
      // If any part of the token/user/expires data is missing, clear partial auth data
      clearAuth();
    }

    if (format24Hour !== null) {
      is24HourFormat.value = JSON.parse(format24Hour)
    }

    // Fetch events for a default range when authenticated
    if (isLoggedIn.value) {
      await fetchUpcomingEvents();
    }
  }

  const isAccessTokenExpired = computed(() => {
    return !accessToken.value || !expiresAt.value || expiresAt.value <= Date.now() + 5 * 1000; // Consider expired 5 seconds before actual expiry
  });

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
    is24HourFormat,
    toggle24HourFormat,
    fetchRangeStart, // Expose new refs
    fetchRangeEnd,   // Expose new refs
    isAccessTokenExpired, // Expose computed property
  }
})
