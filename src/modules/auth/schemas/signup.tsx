import { userTable } from '@/core/database/relational/tables';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const signUpSchema = createInsertSchema(userTable)
  .omit({ id: true })
  .extend({
    nickname: z
      .string()
      .min(3, { message: 'Nickname must be at least 3 characters long' })
      .max(20, { message: 'Nickname must be at most 20 characters long' })
      .trim(),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(100, { message: 'Password must be at most 100 characters long' })
      .trim(),
    confirmPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(100, { message: 'Password must be at most 100 characters long' })
      .trim(),
  })
  .refine(fields => fields.password === fields.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpSchema = z.infer<typeof signUpSchema>;
