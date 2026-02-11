import { randomBytes } from 'crypto';
import { encrypt, decrypt } from '@/lib/crypto';

interface OAuthStatePayload {
  businessId: string;
  returnTo: string;
  nonce: string;
  ts: number;
}

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export function createOAuthState(businessId: string, returnTo: string): string {
  const payload: OAuthStatePayload = {
    businessId,
    returnTo,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
  };
  const encrypted = encrypt(JSON.stringify(payload));
  // URL-safe base64: replace +/ with -_, strip =
  return Buffer.from(encrypted).toString('base64url');
}

export function validateOAuthState(stateParam: string): { businessId: string; returnTo: string } {
  let payload: OAuthStatePayload;
  try {
    const encrypted = Buffer.from(stateParam, 'base64url').toString();
    payload = JSON.parse(decrypt(encrypted));
  } catch {
    throw new Error('invalid_state');
  }

  if (!payload.businessId || !payload.returnTo || !payload.nonce || !payload.ts) {
    throw new Error('invalid_state');
  }

  if (Date.now() - payload.ts > MAX_AGE_MS) {
    throw new Error('state_expired');
  }

  return { businessId: payload.businessId, returnTo: payload.returnTo };
}
