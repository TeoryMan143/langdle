import { sessionTable, userTable } from '@/core/database/relational/tables';
import type { InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof userTable>;
export type Session = InferSelectModel<typeof sessionTable>;
export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };
