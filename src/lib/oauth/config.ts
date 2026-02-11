import type { Platform } from '@/types';

export interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function getOAuthConfig(platform: Platform): OAuthProviderConfig {
  switch (platform) {
    case 'meta':
      return {
        authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        clientId: process.env.META_APP_ID!,
        clientSecret: process.env.META_APP_SECRET!,
        scopes: ['ads_management', 'ads_read', 'business_management', 'pages_read_engagement'],
        redirectUri: `${appUrl}/api/connections/meta/callback`,
      };
    case 'google_drive':
      return {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        redirectUri: `${appUrl}/api/connections/google_drive/callback`,
      };
    default:
      throw new Error(`OAuth not supported for platform: ${platform}`);
  }
}
