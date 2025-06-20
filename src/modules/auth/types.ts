import type { InferSelectModel } from 'drizzle-orm';
import { sessionTable, userTable } from '@/core/database/relational/tables';

export type User = InferSelectModel<typeof userTable>;
export type UserDTO = Omit<User, 'password'>;

export type Session = InferSelectModel<typeof sessionTable>;
export type SessionValidationResult =
  | { session: Session; user: UserDTO }
  | { session: null; user: null };

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
