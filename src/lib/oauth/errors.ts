export interface OAuthError {
  title: string;
  message: string;
  severity: 'error' | 'warning';
  canRetry: boolean;
}

const ERROR_MAP: Record<string, OAuthError> = {
  unsupported_platform: {
    title: 'Unsupported Platform',
    message: 'This platform is not available for connection.',
    severity: 'error',
    canRetry: false,
  },
  missing_code: {
    title: 'Authorization Cancelled',
    message: 'The authorization was cancelled or denied. Please try again.',
    severity: 'warning',
    canRetry: true,
  },
  invalid_state: {
    title: 'Security Validation Failed',
    message: 'The connection request could not be verified. Please try connecting again.',
    severity: 'error',
    canRetry: true,
  },
  state_expired: {
    title: 'Request Expired',
    message: 'The connection request timed out. Please try connecting again.',
    severity: 'warning',
    canRetry: true,
  },
  oauth_failed: {
    title: 'Connection Failed',
    message: 'Something went wrong while connecting your account. Please try again.',
    severity: 'error',
    canRetry: true,
  },
  network_error: {
    title: 'Network Error',
    message: 'Could not reach the server. Check your connection and try again.',
    severity: 'error',
    canRetry: true,
  },
};

export function getOAuthError(code: string): OAuthError {
  return ERROR_MAP[code] || {
    title: 'Connection Error',
    message: 'An unexpected error occurred. Please try again.',
    severity: 'error' as const,
    canRetry: true,
  };
}
