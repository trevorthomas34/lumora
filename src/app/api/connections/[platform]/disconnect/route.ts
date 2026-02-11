import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';
import type { Platform } from '@/types';

export async function POST(
  _request: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform as Platform;
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

    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('business_id', business.id)
      .eq('platform', platform)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Best-effort token revocation
    try {
      if (connection.access_token_encrypted) {
        const token = decrypt(connection.access_token_encrypted);
        if (platform === 'meta') {
          await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`, {
            method: 'DELETE',
          });
        } else if (platform === 'google_drive') {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        }
      }
    } catch {
      // Revocation is best-effort — continue with deletion
    }

    await supabase
      .from('connections')
      .delete()
      .eq('id', connection.id);

    await supabase.from('action_logs').insert({
      business_id: business.id,
      actor: 'user',
      action_type: 'disconnect_platform',
      description: `Disconnected ${platform}`,
      platform,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
