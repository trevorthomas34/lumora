import { decrypt, encrypt } from '@/lib/crypto';
import { getOAuthConfig } from './config';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Connection, OAuthTokens } from '@/types';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export async function getValidTokens(connection: Connection): Promise<OAuthTokens> {
  const accessToken = connection.access_token_encrypted
    ? decrypt(connection.access_token_encrypted)
    : '';
  const refreshToken = connection.refresh_token_encrypted
    ? decrypt(connection.refresh_token_encrypted)
    : null;

  if (!isExpired(connection.token_expires_at)) {
    return { access_token: accessToken, refresh_token: refreshToken, expires_at: connection.token_expires_at };
  }

  // Token expired — attempt refresh
  try {
    const refreshed = await refreshTokens(connection.platform, accessToken, refreshToken);
    const supabase = createServiceRoleClient();
    await supabase
      .from('connections')
      .update({
        access_token_encrypted: encrypt(refreshed.access_token),
        refresh_token_encrypted: refreshed.refresh_token ? encrypt(refreshed.refresh_token) : connection.refresh_token_encrypted,
        token_expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return refreshed;
  } catch (error) {
    console.error(`Token refresh failed for connection ${connection.id}:`, error);
    const supabase = createServiceRoleClient();
    await supabase
      .from('connections')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', connection.id);
    throw new Error('Token refresh failed — connection marked as expired');
  }
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - EXPIRY_BUFFER_MS < Date.now();
}

async function refreshTokens(
  platform: Connection['platform'],
  currentAccessToken: string,
  refreshToken: string | null
): Promise<OAuthTokens> {
  if (platform === 'meta') {
    return refreshMetaToken(currentAccessToken);
  }
  if (platform === 'google_drive') {
    if (!refreshToken) throw new Error('No refresh token available for Google Drive');
    return refreshGoogleToken(refreshToken);
  }
  throw new Error(`Token refresh not supported for platform: ${platform}`);
}

async function refreshMetaToken(currentToken: string): Promise<OAuthTokens> {
  const config = getOAuthConfig('meta');
  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('client_secret', config.clientSecret);
  url.searchParams.set('fb_exchange_token', currentToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta token refresh failed: ${res.status}`);
  const data = await res.json();

  return {
    access_token: data.access_token,
    refresh_token: null,
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<OAuthTokens> {
  const config = getOAuthConfig('google_drive');
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = await res.json();

  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Google doesn't rotate refresh tokens
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
}
