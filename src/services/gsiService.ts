import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const GOOGLE_CLIENT_ID = '350064938484-i5mqo80eieq2e966i10kus824r4p7pmc.apps.googleusercontent.com';
const TOKEN_REQUEST_TIMEOUT_MS = 20000;
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GSI_SCRIPT_LOAD_TIMEOUT_MS = 15000;

let tokenClient: google.accounts.oauth2.TokenClient | undefined;
let gsiLoadPromise: Promise<void> | null = null;
let gsiInitPromise: Promise<void> | null = null;
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

function isGsiReady() {
  return Boolean(window.google?.accounts?.oauth2);
}

function waitForGsiScript(): Promise<void> {
  if (isGsiReady()) {
    return Promise.resolve();
  }

  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  const loadPromise: Promise<void> = new Promise<void>((resolve, reject) => {
    let script = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`) as HTMLScriptElement | null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      script?.removeEventListener('load', onLoad);
      script?.removeEventListener('error', onError);
    };

    const resolveIfReady = () => {
      if (!isGsiReady()) {
        return false;
      }
      cleanup();
      resolve();
      return true;
    };

    const onLoad = () => {
      if (resolveIfReady()) {
        return;
      }
      cleanup();
      reject(new Error('Google GSI loaded, but oauth2 API is unavailable.'));
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load Google GSI script.'));
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Google GSI script not loaded (timeout).'));
    }, GSI_SCRIPT_LOAD_TIMEOUT_MS);

    if (!script) {
      script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    // The script may already be loaded before listeners are attached.
    resolveIfReady();
  }).finally(() => {
    gsiLoadPromise = null;
  });

  gsiLoadPromise = loadPromise;
  return loadPromise;
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
  if (tokenClient) {
    return Promise.resolve();
  }

  if (gsiInitPromise) {
    return gsiInitPromise;
  }

  const initPromise: Promise<void> = waitForGsiScript()
    .then(() => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: gisCallback,
        error_callback: (error: any) => {
          if (pendingTokenRequest) {
            pendingTokenRequest.reject(new Error(error?.message || 'Google token request failed.'));
          }
          clearPendingTokenRequest();
        },
      });
    })
    .finally(() => {
      gsiInitPromise = null;
    });

  gsiInitPromise = initPromise;
  return initPromise;
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

      const requestOptions: google.accounts.oauth2.OverridableTokenClientConfig = {};
      if (typeof options?.prompt === 'string') {
        requestOptions.prompt = options.prompt;
      }
      if (options?.hint) {
        requestOptions.hint = options.hint;
        requestOptions.login_hint = options.hint;
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
