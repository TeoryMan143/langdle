import type { InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';
import type {
  sessionTable,
  userTable,
} from '@/core/database/relational/tables';
import type { SelectMenuOption } from '@/core/types';
import type {
  googleDataSchema,
  googleSignUpSchema,
} from './schemas/google-data';
import type { oauthTokenSchema } from './schemas/oauth-token';
import type { signInSchema } from './schemas/signin';
import type { signUpSchema } from './schemas/signup';

export type User = InferSelectModel<typeof userTable>;
export type UserDTO = Omit<User, 'password'>;

export type Session = InferSelectModel<typeof sessionTable>;
/** A valid session with its user, as stored at `session:<sessionId>`. */
export type CachedSession = { session: Session; user: UserDTO };
export type SessionValidationResult =
  | CachedSession
  | { session: null; user: null };

/** Payload returned by every endpoint that opens a session. */
export type AuthPayload = {
  user: UserDTO;
  token: string;
  expiresAt: string;
};

export type OAuthProvider = 'google' | 'apple';

/** Claims carried by the encrypted token that finishes an OAuth sign up. */
export type OAuthSignupPayload = {
  provider: OAuthProvider;
  providerId: string;
  nickname: string;
  email: string;
};

/** What `GET /auth/oauth/signup-data` reveals of a sign up token. */
export type OAuthSignupData = Pick<
  OAuthSignupPayload,
  'provider' | 'nickname' | 'email'
>;

/** Claims taken from a verified Google or Apple ID token. */
export type OAuthIdentity = {
  providerId: string;
  email?: string;
  name?: string;
};

/**
 * Answer of the native sign in endpoints: a session for known accounts, the
 * data to finish the sign up otherwise.
 */
export type OAuthTokenResult =
  | ({ status: 'signedIn' } & AuthPayload)
  | {
      status: 'needsSignup';
      dataToken: string;
      nickname: string;
      email: string;
    };

/* ------------------------------ Component props ----------------------------- */

export interface CountrySelectorProps {
  id: string;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onChange: (value: SelectMenuOption['value']) => void;
  selectedValue: SelectMenuOption;
}

/* ------------------------------- Schema types ------------------------------ */

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type SignInSchema = z.infer<typeof signInSchema>;
export type GoogleDataSchema = z.infer<typeof googleDataSchema>;
export type GoogleSignUpSchema = z.infer<typeof googleSignUpSchema>;
export type OAuthTokenSchema = z.infer<typeof oauthTokenSchema>;

/* -------------------------------- Error keys ------------------------------- */

const signInErrorsList = ['invalidUserPassword', 'unknown'] as const;
export const signInErrors = new Set(signInErrorsList);
export type SignInError = (typeof signInErrorsList)[number];

const signUpErrorsList = [
  'nicknameAlreadyExists',
  'emailAlreadyExists',
  'failedCreateUser',
  'unknown',
] as const;
export const signUpErrors = new Set(signUpErrorsList);
export type SignUpError = (typeof signUpErrorsList)[number];

export const signOutErrorsList = ['unknown', 'noSession'] as const;
export const signOutErrors = new Set(signOutErrorsList);
export type SignOutError = (typeof signOutErrorsList)[number];
