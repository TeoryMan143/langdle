import type { z } from 'zod';
import type { ClientRequestInfo } from '@/core/types';
import type { UserDTO } from '@/modules/auth/types';
import type {
  gameLogClientSchema,
  gameLogQuerySchema,
  gameLogReqSchema,
} from './schemas/game-log';

/**
 * What a player did: opened a game that is not over yet (`start`), tried a
 * language (`guess`, the right one included) and how the game ended.
 */
export const gameLogEvents = ['start', 'guess', 'win', 'lose'] as const;

export type GameLogEvent = (typeof gameLogEvents)[number];

/** The body of `POST /api/logs/game`: what the client knows about the event. */
export type GameLogReq = z.infer<typeof gameLogReqSchema>;

/** The device and browser the client reports along with an event. */
export type GameLogClient = z.infer<typeof gameLogClientSchema>;

export type GameLogQuery = z.infer<typeof gameLogQuerySchema>;

/** What a client asks `GET /api/logs/game` for; the API fills in the rest. */
export type GameLogPageParams = Partial<GameLogQuery>;

/** The signed in player, as the log keeps them. */
export type GameLogUser = Pick<
  UserDTO,
  'id' | 'nickname' | 'email' | 'country' | 'admin'
>;

/**
 * One stored event: the client's report, the player when signed in and what
 * the API read from the request itself.
 */
export type GameLogEntry = GameLogReq & {
  /** When the API received it, ISO 8601 UTC. */
  at: string;
  user: GameLogUser | null;
  request: ClientRequestInfo;
};

/** A stored event with its stream id (`<ms>-<seq>`), the paging cursor. */
export type StoredGameLog = GameLogEntry & { id: string };

export type GameLogPage = {
  items: StoredGameLog[];
  /** The `cursor` of the next (older) batch, `null` on the last one. */
  nextCursor: string | null;
  /** Every event of the day. */
  total: number;
};
