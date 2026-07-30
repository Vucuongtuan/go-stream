import { createHmac, timingSafeEqual } from 'crypto';
import { FastifyRequest } from 'fastify';

interface AccessTokenClaims {
  user_id: number;
  token_type: 'access';
  exp: number;
}

function base64URLDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

// The main API issues HS256 access tokens. Verify their signature and the
// minimum claims required by chat instead of trusting user_id in the body.
export function authenticatedUserID(request: FastifyRequest): number | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.slice('Bearer '.length);
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  let header: { alg?: string };
  let claims: Partial<AccessTokenClaims>;
  try {
    header = JSON.parse(base64URLDecode(headerPart).toString('utf8'));
    claims = JSON.parse(base64URLDecode(payloadPart).toString('utf8'));
  } catch {
    return null;
  }

  const userID = claims.user_id;
  const expiresAt = claims.exp;
  if (header.alg !== 'HS256' || !Number.isSafeInteger(userID) || !userID || userID <= 0 ||
      claims.token_type !== 'access' || !Number.isFinite(expiresAt) || !expiresAt || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const secret = process.env.JWT_SECRET || 'changeme';
  const expected = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest();
  let supplied: Buffer;
  try {
    supplied = base64URLDecode(signaturePart);
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  return userID;
}
