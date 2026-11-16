import { z } from 'zod';

export const signInSchema: z.ZodObject<{
  nickname: z.ZodString;
  password: z.ZodString;
}> = z.object({
  nickname: z.string().min(1, { error: 'Nickname required' }).trim(),
  password: z.string().min(1, { error: 'Password required' }).trim(),
});
