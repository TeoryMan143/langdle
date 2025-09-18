import { z } from 'zod';

export const googleDataSchema = z.object({
  nickname: z.string(),
  country: z.string().min(1, { message: 'Country required' }),
});

export const googleDataActionSchema = googleDataSchema.extend({
  googleId: z.string().min(1, { message: 'googleId required' }),
  email: z.string().email({ message: 'It must be an email' }),
});

export type GoogleDataSchema = z.infer<typeof googleDataSchema>;
export type GoogleDataActionSchema = z.infer<typeof googleDataActionSchema>;
