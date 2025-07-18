import { z } from 'zod';

export const googleDataSchema = z.object({
  nickname: z.string(),
  country: z.string().min(1, { message: 'Country required' }),
});

export const googleDataActionSchema = googleDataSchema.extend({
  googleId: z.string().min(1, { message: 'googleId required' }),
});

export type GoogleDataSchema = z.infer<typeof googleDataSchema>;
export type GoogleDataActionSchema = z.infer<typeof googleDataActionSchema>;
