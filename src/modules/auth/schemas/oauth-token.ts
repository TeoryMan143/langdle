import { z } from 'zod';

/** The ID token a native Google / Apple SDK hands to the mobile app. */
export const oauthTokenSchema = z.object({
  idToken: z.string().min(1, { message: 'idToken required' }),
  /** Apple only sends the user's name to the app, never in the token. */
  nickname: z.string().optional(),
});
