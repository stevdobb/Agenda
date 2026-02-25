import { defineStore } from 'pinia'
import { ref } from 'vue'
import { computed } from 'vue'
import { getUpcomingEvents } from '@/services/googleCalendar'

interface GoogleAccount {
  id: string; // Unique ID for the account (e.g., Google user ID from 'sub' claim)
  accessToken: string;
  expiresAt: number;
  user: any; // User profile data (e.g., name, email, picture)
  color: string; // Unique color for this account's events
  events: any[]; // Events fetched for this account
}

export const useAuthStore = defineStore('auth', () => {
  const accounts = ref<GoogleAccount[]>([]);
  const activeAccountId = ref<string | null>(null); // To track which account is currently active for event creation/login display

  // Predefined set of colors for accounts
  const accountColors = [
    'bg-red-100 dark:bg-red-900 border-red-500',
    'bg-blue-100 dark:bg-blue-900 border-blue-500',
    'bg-green-100 dark:bg-green-900 border-green-500',
    'bg-yellow-100 dark:bg-yellow-900 border-yellow-500',
    'bg-purple-100 dark:bg-purple-900 border-purple-500',
    'bg-indigo-100 dark:bg-indigo-900 border-indigo-500',
    'bg-pink-100 dark:bg-pink-900 border-pink-500',
  ];

  const isLoggedIn = computed(() => accounts.value.length > 0)
  const isDarkMode = ref(false)
  const is24HourFormat = ref(true) // Default to 24-hour format
  const isFetchingEvents = ref(false); // To prevent race conditions

  const upcomingEvents = computed(() => {
    const allAggregatedEvents: any[] = [];
    accounts.value.forEach(account => {
      allAggregatedEvents.push(...account.events);
    });

    // Sort all events by start time
    allAggregatedEvents.sort((a, b) => {
      const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : new Date(a.start.date).getTime();
      const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : new Date(b.start.date).getTime();
      return timeA - timeB;
    });
    console.log('AuthStore: upcomingEvents computed - returning total events:', allAggregatedEvents.length);
    return allAggregatedEvents;
  });

function checkDarkMode() {
  if (localStorage.theme === 'dark') {
    document.documentElement.classList.add('dark')
    isDarkMode.value = true
  } else {
    document.documentElement.classList.remove('dark')
    isDarkMode.value = false
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

  async function fetchUpcomingEvents(startDate?: Date, endDate?: Date, force: boolean = false) {
    if (isFetchingEvents.value) {
      console.warn('AuthStore: An event fetch is already in progress. Skipping.');
      return;
    }

    console.log('AuthStore: fetchUpcomingEvents called.');
    if (accounts.value.length === 0) {
      console.warn("AuthStore: No accounts logged in to fetch events for.");
      return;
    }

    try {
      isFetchingEvents.value = true;

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      if (!effectiveStartDate || !effectiveEndDate) {
        // Default range: From today for one year
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        effectiveStartDate = new Date(today);
        effectiveEndDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()); // One year from today
      }

      // If forcing, clear the existing range to ensure a fresh fetch of the desired range
      // Note: Range tracking is currently disabled
      if (force) {
        // fetchRangeStart.value = null;
        // fetchRangeEnd.value = null;
      }

      // --- Start of change: Prevent re-fetching contained ranges ---
      // if (!force && fetchRangeStart.value && fetchRangeEnd.value && effectiveStartDate >= fetchRangeStart.value && effectiveEndDate <= fetchRangeEnd.value) {
      //   console.log('AuthStore: Event range is already covered. Skipping fetch.');
      //   return;
      // }

      // // Expand the fetch range instead of replacing it
      // let newFetchStart = effectiveStartDate;
      // if (fetchRangeStart.value) {
      //   newFetchStart = new Date(Math.min(newFetchStart.getTime(), fetchRangeStart.value.getTime()));
      // }
      // let newFetchEnd = effectiveEndDate;
      // if (fetchRangeEnd.value) {
      //   newFetchEnd = new Date(Math.max(newFetchEnd.getTime(), fetchRangeEnd.value.getTime()));
      // }
      // --- End of change ---

      console.log('AuthStore: Fetching events for range:', effectiveStartDate.toISOString(), effectiveEndDate.toISOString());

      const timeMin = effectiveStartDate.toISOString();
      const timeMax = effectiveEndDate.toISOString();

      for (const account of accounts.value) {
        console.log(`AuthStore: Processing account ${account.user.email} (${account.id})`);
        // Check if token is expired for this account
        if (account.expiresAt <= Date.now() + 5 * 1000) { // 5 seconds buffer
          console.warn(`AuthStore: Access token for account ${account.user.email} is expired. Skipping event fetch.`);
          // Keep existing events until token is refreshed to avoid abrupt empty state.
          continue;
        }

        try {
          const accountEvents = await getUpcomingEvents(account.accessToken, timeMin, timeMax);
          console.log(`AuthStore: Fetched ${accountEvents.length} events for account ${account.user.email}.`);
          // Augment events with account ID and color before storing
          account.events = accountEvents.map((event: any) => ({
            ...event,
            accountId: account.id,
            accountColor: account.color,
          }));
        } catch (error) {
          console.error(`AuthStore: Failed to fetch events for account ${account.user.email}:`, error);
          account.events = []; // Clear events for failed fetch
        }
      }

      // if (allFetchesSuccessful) {
      //   fetchRangeStart.value = newFetchStart;
      //   fetchRangeEnd.value = newFetchEnd;
      // }
      console.log('AuthStore: fetchUpcomingEvents completed. Total events in accounts:', accounts.value.reduce((sum, acc) => sum + acc.events.length, 0));
    } finally {
      isFetchingEvents.value = false;
    }
  }

  function setToken(accessToken: string, expires_in: number, user_id: string, user_data: any) {
    const expirationTime = Date.now() + expires_in * 1000;
    let account = accounts.value.find(acc => acc.id === user_id);

    if (account) {
      // Update existing account
      account.accessToken = accessToken;
      account.expiresAt = expirationTime;
      account.user = user_data; // Update user data in case it changed
    } else {
      // Add new account
      const newAccount: GoogleAccount = {
        id: user_id,
        accessToken: accessToken,
        expiresAt: expirationTime,
        user: user_data,
        color: accountColors[accounts.value.length % accountColors.length], // Assign a color
        events: [],
      };
      accounts.value.push(newAccount);
    }
    activeAccountId.value = user_id;
    console.log('AuthStore: Account added/updated and set as active:', user_id, accounts.value);

    // Persist all accounts to localStorage
    localStorage.setItem('google_accounts', JSON.stringify(accounts.value));
    localStorage.setItem('active_google_account_id', user_id);
  }

  function setUser(userData: any) {
    if (activeAccountId.value) {
      const account = accounts.value.find(acc => acc.id === activeAccountId.value);
      if (account) {
        account.user = userData;
        localStorage.setItem('google_accounts', JSON.stringify(accounts.value)); // Persist change
      }
    }
  }

  function clearAuth() {
    accounts.value = [];
    activeAccountId.value = null;
    localStorage.removeItem('google_accounts');
    localStorage.removeItem('active_google_account_id');
    // Keep '24_hour_format' as it's a general setting, not account-specific
  }

  function removeAccount(accountId: string) {
    accounts.value = accounts.value.filter(account => account.id !== accountId);
    if (activeAccountId.value === accountId) {
      activeAccountId.value = accounts.value.length > 0 ? accounts.value[0].id : null;
    }
    localStorage.setItem('google_accounts', JSON.stringify(accounts.value));
    if (activeAccountId.value) {
      localStorage.setItem('active_google_account_id', activeAccountId.value);
    } else {
      localStorage.removeItem('active_google_account_id');
    }
    // Re-fetch events for remaining accounts
    fetchUpcomingEvents();
  }



  async function checkAuth() {
    const savedAccounts = localStorage.getItem('google_accounts');
    const savedActiveAccountId = localStorage.getItem('active_google_account_id');
    const format24Hour = localStorage.getItem('24_hour_format');

    if (savedAccounts) {
      let parsedAccounts: GoogleAccount[] = [];
      try {
        parsedAccounts = JSON.parse(savedAccounts);
      } catch (e) {
        console.error("Failed to parse accounts from localStorage", e);
        localStorage.removeItem('google_accounts');
        return;
      }

      console.log('AuthStore: Loaded accounts from localStorage:', parsedAccounts);

      const initialCount = parsedAccounts.length;
      const stillValidAccounts = parsedAccounts.filter(account => account.user && typeof account.user.error === 'undefined');
      const expiredAccounts = stillValidAccounts.filter(account => account.expiresAt <= Date.now() + 5000);

      if (stillValidAccounts.length < initialCount) {
        console.warn('AuthStore: Removed invalid accounts from storage.');
        localStorage.setItem('google_accounts', JSON.stringify(stillValidAccounts));
      }

      accounts.value = stillValidAccounts.map((account) => ({
        ...account,
        events: Array.isArray(account.events) ? account.events : [],
      }));

      if (expiredAccounts.length > 0) {
        console.log(`AuthStore: ${expiredAccounts.length} account(s) have expired tokens. A silent refresh can renew them when needed.`);
      }
      
      if (savedActiveAccountId && accounts.value.some(acc => acc.id === savedActiveAccountId)) {
        activeAccountId.value = savedActiveAccountId;
        console.log('AuthStore: Active account restored:', activeAccountId.value);
      } else if (accounts.value.length > 0) {
        activeAccountId.value = accounts.value[0].id; // Set first available as active
        console.log('AuthStore: No active account ID found or invalid, setting first account as active:', activeAccountId.value);
      } else {
        activeAccountId.value = null;
        console.log('AuthStore: No active accounts available.');
      }
    } else {
      console.log('AuthStore: No saved accounts found in localStorage.');
      // Clear old single-account localStorage items if multi-account not found
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_expires_at');
      localStorage.removeItem('google_user');
    }

    if (format24Hour !== null) {
      is24HourFormat.value = JSON.parse(format24Hour);
    }

    // Fetch events for all active accounts if logged in
    if (accounts.value.length > 0) {
      await fetchUpcomingEvents();
    }
  }

  return {
    accounts,           // Expose the accounts array
    activeAccountId,    // Expose the active account ID
    isLoggedIn,
    isFetchingEvents,
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
    removeAccount,
  }
})
