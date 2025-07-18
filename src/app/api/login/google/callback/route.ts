import { decodeIdToken, type OAuth2Tokens } from 'arctic';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import {
  createSession,
  generateSessionToken,
  google,
  setSessionTokenCookie,
} from '@/modules/auth/manager';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_oauth_state')?.value ?? null;
  const codeVerifier = cookieStore.get('google_code_verifier')?.value ?? null;
  if (
    code === null ||
    state === null ||
    storedState === null ||
    codeVerifier === null
  ) {
    return new Response(null, {
      status: 400,
    });
  }
  if (state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  let tokens: OAuth2Tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch (_) {
    // Invalid code or client credentials
    return new Response(null, {
      status: 400,
    });
  }
  const claims = decodeIdToken(tokens.idToken()) as {
    sub: string;
    name: string;
  };
  const googleUserId = claims.sub;
  const username = claims.name;

  try {
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.googleId, googleUserId));

    if (existingUser) {
      const sessionToken = generateSessionToken();
      const session = await createSession(sessionToken, existingUser.id);
      await setSessionTokenCookie(sessionToken, session.expiresAt);
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
        },
      });
    }

    const secret = jose.base64url.decode(process.env.JWT_SECRET as string);
    const dataToken = await new jose.EncryptJWT({
      nickname: username,
      googleId: googleUserId,
    })
      .setExpirationTime('30m')
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .encrypt(secret);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/endgoogle?data=${dataToken}`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 500,
    });
  }
}
