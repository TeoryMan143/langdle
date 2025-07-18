import { z } from 'zod';

export const signInSchema: z.ZodObject<{
  nickname: z.ZodString;
  password: z.ZodString;
}> = z.object({
  nickname: z.string().min(1, { message: 'Nickname required' }).trim(),
  password: z.string().min(1, { message: 'Password required' }).trim(),
});
export type SignInSchema = z.infer<typeof signInSchema>;
