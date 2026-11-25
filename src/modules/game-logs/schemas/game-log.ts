import { z } from 'zod';
import { gameLogEvents } from '../types';

export const GAME_LOG_PAGE_DEFAULT_SIZE = 50;
export const GAME_LOG_PAGE_MAX_SIZE = 200;

const text = (max: number) => z.string().trim().min(1).max(max);

const size = z.object({
  width: z.number().int().min(0).max(100_000),
  height: z.number().int().min(0).max(100_000),
});

/**
 * What the client can tell about itself and the API cannot read from the
 * request. Every field is optional: old clients and private browsers send
 * less.
 */
export const gameLogClientSchema = z.object({
  /** `web`, `android`, `ios`. */
  platform: text(16).optional(),
  appVersion: text(32).optional(),
  /** The interface language (`en`, `es`, `pt`). */
  locale: text(16).optional(),
  /** IANA zone (`America/Bogota`) or, on mobile, its abbreviation. */
  timezone: text(64).optional(),
  utcOffsetMinutes: z.number().int().min(-1000).max(1000).optional(),
  /** The device's preferred languages, as BCP 47 tags. */
  languages: z.array(text(35)).max(10).optional(),
  screen: size.optional(),
  viewport: size.optional(),
  pixelRatio: z.number().positive().max(20).optional(),
  /** The page that sent the player to the game. */
  referrer: text(512).optional(),
  path: text(256).optional(),
});

/** The body of `POST /api/logs/game`. */
export const gameLogReqSchema = z
  .object({
    event: z.enum(gameLogEvents),
    /** Ties the events of one game together; chosen by the client. */
    gameId: text(64),
    type: z.enum(['daily', 'random']),
    targetLang: text(64),
    /** The language tried; required for a `guess`. */
    guessLang: text(64).optional(),
    /**
     * The guesses made so far, this one included: the attempt number of a
     * guess, the total of a win or a loss, and of a resumed `start`.
     */
    attempt: z.number().int().min(0).max(100).optional(),
    /** A `start` that continues a daily game saved on the device. */
    resumed: z.boolean().optional(),
    /** Random id the device keeps, to follow a signed out player. */
    visitorId: text(64).optional(),
    client: gameLogClientSchema.optional(),
  })
  .refine(log => log.event !== 'guess' || log.guessLang, {
    path: ['guessLang'],
    message: 'A guess needs the language tried',
  });

/** The query of `GET /api/logs/game`. */
export const gameLogQuerySchema = z.object({
  /** The UTC day to read, today by default. */
  date: z.iso.date().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GAME_LOG_PAGE_MAX_SIZE)
    .default(GAME_LOG_PAGE_DEFAULT_SIZE),
  /** The `nextCursor` of the previous batch: a stream entry id. */
  cursor: z
    .string()
    .regex(/^\d+-\d+$/)
    .optional(),
});
