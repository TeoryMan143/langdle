import { userTable } from '@/core/database/relational/tables';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const signInSchema = createInsertSchema(userTable)
  .omit({ id: true })
  .extend({
    nickname: z.string().min(1, { message: 'Nickname required' }).trim(),
    password: z.string().min(1, { message: 'Password required' }).trim(),
  });
export type SignInSchema = z.infer<typeof signInSchema>;
