import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { userTable } from '@/core/database/relational/tables';

export const signUpSchema = createInsertSchema(userTable)
  // never let a client decide these: they are set by the server or by the
  // profile endpoints.
  .omit({
    id: true,
    admin: true,
    googleId: true,
    nativeLanguage: true,
    fluent: true,
  })
  .extend({
    nickname: z
      .string()
      .min(3, { error: 'Nickname must be at least 3 characters long' })
      .max(20, { error: 'Nickname must be at most 20 characters long' })
      .trim(),
    email: z
      .email({ error: 'It must be a valid email' })
      .min(3, { error: 'Email must be at least 3 characters long' })
      .max(254, { error: 'Email must be at most 254 characters long' })
      .trim(),
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters long' })
      .max(100, { error: 'Password must be at most 100 characters long' })
      .trim(),
    confirmPassword: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters long' })
      .max(100, { error: 'Password must be at most 100 characters long' })
      .trim(),
    country: z.string().min(1, { error: 'Country is required' }),
  })
  .refine(fields => fields.password === fields.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });
