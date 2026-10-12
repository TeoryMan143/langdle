import { z } from 'zod';

/** Fields the user fills in to finish a Google sign up. */
export const googleDataSchema = z.object({
  nickname: z.string(),
  country: z.string().min(1, { message: 'Country required' }),
});

/**
 * What the API receives: the encrypted token issued by the Google callback
 * carries the trusted claims (`googleId`, `email`).
 */
export const googleSignUpSchema = googleDataSchema.extend({
  dataToken: z.string().min(1, { message: 'dataToken required' }),
});
