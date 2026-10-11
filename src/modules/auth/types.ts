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
import type { signInSchema } from './schemas/signin';
import type { signUpSchema } from './schemas/signup';

export type User = InferSelectModel<typeof userTable>;
export type UserDTO = Omit<User, 'password'>;

export type Session = InferSelectModel<typeof sessionTable>;
export type SessionValidationResult =
  | { session: Session; user: UserDTO }
  | { session: null; user: null };

/** Payload returned by every endpoint that opens a session. */
export type AuthPayload = {
  user: UserDTO;
  token: string;
  expiresAt: string;
};

export type GoogleSignupPayload = {
  nickname: string;
  googleId: string;
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

/* -------------------------------- Error keys ------------------------------- */

const signInErrorsList = ['invalidUserPassword', 'unknown'] as const;
export const signInErrors = new Set(signInErrorsList);
export type SignInError = (typeof signInErrorsList)[number];

const signUpErrorsList = [
  'nicknameAlreadyExists',
  'failedCreateUser',
  'unknown',
] as const;
export const signUpErrors = new Set(signUpErrorsList);
export type SignUpError = (typeof signUpErrorsList)[number];

export const signOutErrorsList = ['unknown', 'noSession'] as const;
export const signOutErrors = new Set(signOutErrorsList);
export type SignOutError = (typeof signOutErrorsList)[number];
