import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOAuthConfig } from '@/lib/oauth/config';
import { createOAuthState } from '@/lib/oauth/state';
import { NextResponse } from 'next/server';
import type { Platform } from '@/types';

const SUPPORTED_PLATFORMS: Platform[] = ['meta', 'google_drive'];

export async function GET(
  request: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform as Platform;
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/settings';

    const config = getOAuthConfig(platform);
    const state = createOAuthState(business.id, returnTo);

    const authorizeUrl = new URL(config.authorizeUrl);
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizeUrl.searchParams.set('scope', config.scopes.join(platform === 'meta' ? ',' : ' '));
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('response_type', 'code');

    if (platform === 'google_drive') {
      authorizeUrl.searchParams.set('access_type', 'offline');
      authorizeUrl.searchParams.set('prompt', 'consent');
    }

    return NextResponse.json({ url: authorizeUrl.toString() });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json({ error: 'Failed to build authorization URL' }, { status: 500 });
  }
}
