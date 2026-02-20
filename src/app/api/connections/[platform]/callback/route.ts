import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOAuthConfig } from '@/lib/oauth/config';
import { validateOAuthState } from '@/lib/oauth/state';
import { encrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';
import type { Platform } from '@/types';

const SUPPORTED_PLATFORMS: Platform[] = ['meta', 'google_drive'];

export async function GET(
  request: Request,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform as Platform;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.redirect(`${appUrl}/settings?error=unsupported_platform`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_code`);
  }

  let state: { businessId: string; returnTo: string };
  try {
    state = validateOAuthState(stateParam);
  } catch (err) {
    const code = err instanceof Error ? err.message : 'invalid_state';
    return NextResponse.redirect(`${appUrl}/settings?error=${code}`);
  }

  try {
    const config = getOAuthConfig(platform);

    // Exchange code for tokens
    let tokenData: Record<string, unknown>;

    if (platform === 'meta') {
      // Meta uses GET for token exchange
      const tokenUrl = new URL(config.tokenUrl);
      tokenUrl.searchParams.set('client_id', config.clientId);
      tokenUrl.searchParams.set('client_secret', config.clientSecret);
      tokenUrl.searchParams.set('redirect_uri', config.redirectUri);
      tokenUrl.searchParams.set('code', code);
      const res = await fetch(tokenUrl.toString());
      if (!res.ok) throw new Error(`Meta token exchange failed: ${res.status}`);
      tokenData = await res.json();

      // Exchange short-lived token for long-lived token (~60 days)
      const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longLivedUrl.searchParams.set('client_id', config.clientId);
      longLivedUrl.searchParams.set('client_secret', config.clientSecret);
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token as string);
      const llRes = await fetch(longLivedUrl.toString());
      if (!llRes.ok) throw new Error(`Meta long-lived token exchange failed: ${llRes.status}`);
      tokenData = await llRes.json();
    } else {
      // Google uses POST for token exchange
      const res = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
      tokenData = await res.json();
    }

    // Fetch account info
    let accountId: string | null = null;
    let accountName: string | null = null;

    if (platform === 'meta') {
      const meRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name&access_token=${tokenData.access_token}`
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        const first = meData.data?.[0];
        if (first) {
          accountId = first.id; // act_XXXXX format
          accountName = first.name;
        }
      }
    } else if (platform === 'google_drive') {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        accountId = infoData.id;
        accountName = infoData.email;
      }
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()
      : null;

    const supabase = createServiceRoleClient();

    // Upsert connection
    await supabase.from('connections').upsert(
      {
        business_id: state.businessId,
        platform,
        access_token_encrypted: encrypt(tokenData.access_token as string),
        refresh_token_encrypted: tokenData.refresh_token
          ? encrypt(tokenData.refresh_token as string)
          : null,
        token_expires_at: expiresAt,
        platform_account_id: accountId,
        platform_account_name: accountName,
        scopes: config.scopes,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,platform' }
    );

    // Log the connection
    await supabase.from('action_logs').insert({
      business_id: state.businessId,
      actor: 'user',
      action_type: 'connect_platform',
      description: `Connected ${platform}${accountName ? ` (${accountName})` : ''}`,
      platform,
    });

    const returnTo = state.returnTo || '/settings';
    return NextResponse.redirect(`${appUrl}${returnTo}?connected=${platform}`);
  } catch (error) {
    console.error(`OAuth callback error for ${platform}:`, error);
    const returnTo = state.returnTo || '/settings';
    return NextResponse.redirect(`${appUrl}${returnTo}?error=oauth_failed`);
  }
}
