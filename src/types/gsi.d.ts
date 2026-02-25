// Basic type definitions for Google Identity Services (GSI)
// This is not exhaustive but covers the needs of this application.

declare namespace google.accounts.oauth2 {
  interface OverridableTokenClientConfig {
    prompt?: string;
    hint?: string;
    login_hint?: string;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    prompt: string;
    scope: string;
    token_type: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (tokenResponse: TokenResponse) => void;
    error_callback?: (error: any) => void;
    prompt?: string;
  }

  interface TokenClient {
    requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}
