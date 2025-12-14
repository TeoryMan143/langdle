import { z } from 'zod';

export const guessHistoryReqSchema = z.object({
  type: z.enum(['daily', 'random']),
  targetLang: z.string(),
  guesses: z.number().min(0),
  guessed: z.boolean(),
});

export type GuessHistoryReq = z.infer<typeof guessHistoryReqSchema>;
