import { createHmac, timingSafeEqual } from 'crypto';

const UNSUBSCRIBE_PURPOSE = 'unsubscribe-v1';

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not configured');
  }
  return secret;
}

export function signUnsubscribeToken(contactId: string): string {
  const hmac = createHmac('sha256', getSecret());
  hmac.update(`${UNSUBSCRIBE_PURPOSE}:${contactId}`);
  return hmac.digest('hex');
}

export function verifyUnsubscribeToken(
  contactId: string,
  token: string,
): boolean {
  const expected = signUnsubscribeToken(contactId);
  const provided = token.toLowerCase();
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(contactId: string): string {
  const base = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
  const token = signUnsubscribeToken(contactId);
  return `${base}/unsubscribe/${contactId}/${token}`;
}
