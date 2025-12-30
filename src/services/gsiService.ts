import { useAuthStore } from '@/stores/auth';

const GOOGLE_CLIENT_ID = '350064938484-i5mqo80eieq2e966i10kus824r4p7pmc.apps.googleusercontent.com';

let tokenClient: google.accounts.oauth2.TokenClient | undefined;

// This function handles the response from Google after a token is received
const gisCallback: google.accounts.oauth2.TokenResponseCallback = async (tokenResponse) => {
  const authStore = useAuthStore();
  if (tokenResponse && tokenResponse.access_token && tokenResponse.expires_in) {
    try {
      // Fetch user profile
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch if response is not json
        throw new Error(`Failed to fetch user profile: ${errorData.error_description || response.statusText}`);
      }

      const userinfo = await response.json();

      if (!userinfo.sub) {
        throw new Error("User ID (sub) not found in user profile response.");
      }
      
      // Pass user_id (from sub claim) and userinfo to setToken
      authStore.setToken(tokenResponse.access_token, Number(tokenResponse.expires_in), userinfo.sub, userinfo)
      // Fetch upcoming events after login (for all accounts)
      await authStore.fetchUpcomingEvents();
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(`Login failed: ${error.message}`);
    }
  }
};

// Initializes the Google Identity Services client
export function initializeGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (window.google && window.google.accounts) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: gisCallback,
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

// Prompts the user for a new access token
export function requestAccessToken(options?: { prompt: string }) {
  if (tokenClient) {
    if (options?.prompt) {
      tokenClient.requestAccessToken({ prompt: options.prompt });
    } else {
      tokenClient.requestAccessToken();
    }
  } else {
    console.error("GSI client not initialized.");
    // Optionally, try to initialize it now
    initializeGsi().then(() => {
      tokenClient?.requestAccessToken();
    }).catch(error => alert(error.message));
  }
}
