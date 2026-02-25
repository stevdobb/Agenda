import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const GOOGLE_CLIENT_ID = '350064938484-i5mqo80eieq2e966i10kus824r4p7pmc.apps.googleusercontent.com';
const TOKEN_REQUEST_TIMEOUT_MS = 20000;

let tokenClient: google.accounts.oauth2.TokenClient | undefined;
let pendingTokenRequest:
  | {
      resolve: (value: google.accounts.oauth2.TokenResponse) => void;
      reject: (reason?: unknown) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  | null = null;

export interface RequestAccessTokenOptions {
  prompt?: string;
  hint?: string;
}

function clearPendingTokenRequest() {
  if (!pendingTokenRequest) {
    return;
  }
  clearTimeout(pendingTokenRequest.timeoutId);
  pendingTokenRequest = null;
}

// This function handles the response from Google after a token is received
const gisCallback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
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
      if (pendingTokenRequest) {
        pendingTokenRequest.resolve(tokenResponse);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      uiStore.showAlert('Login Failed', error.message);
      if (pendingTokenRequest) {
        pendingTokenRequest.reject(error);
      }
    } finally {
      clearPendingTokenRequest();
    }
    return;
  }

  if (pendingTokenRequest) {
    pendingTokenRequest.reject(new Error('Token response did not contain an access token.'));
  }
  clearPendingTokenRequest();
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
export function requestAccessToken(options?: RequestAccessTokenOptions): Promise<google.accounts.oauth2.TokenResponse> {
  const uiStore = useUiStore();
  return new Promise((resolve, reject) => {
    if (pendingTokenRequest) {
      reject(new Error('A token request is already in progress.'));
      return;
    }

    const timeoutId = setTimeout(() => {
      if (pendingTokenRequest) {
        pendingTokenRequest.reject(new Error('Timed out while requesting a Google access token.'));
      }
      clearPendingTokenRequest();
    }, TOKEN_REQUEST_TIMEOUT_MS);

    pendingTokenRequest = {
      resolve,
      reject,
      timeoutId,
    };

    const requestToken = () => {
      if (!tokenClient) {
        if (pendingTokenRequest) {
          pendingTokenRequest.reject(new Error('GSI client not initialized.'));
        }
        clearPendingTokenRequest();
        return;
      }

      const requestOptions: any = {};
      if (typeof options?.prompt === 'string') {
        requestOptions.prompt = options.prompt;
      }
      if (options?.hint) {
        requestOptions.hint = options.hint;
      }

      tokenClient.requestAccessToken(requestOptions);
    };

    if (tokenClient) {
      requestToken();
      return;
    }

    initializeGsi()
      .then(requestToken)
      .catch((error: any) => {
        uiStore.showAlert('Error', error.message);
        if (pendingTokenRequest) {
          pendingTokenRequest.reject(error);
        }
        clearPendingTokenRequest();
      });
  });
}
