import {
  appendToStream,
  deleteStreamEntries,
  readStreamNewestFirst,
  streamLength,
} from '@/core/database/redis/key-getters';
import type { ClientRequestInfo } from '@/core/types';
import type { UserDTO } from '@/modules/auth/types';
import type {
  GameLogEntry,
  GameLogPage,
  GameLogQuery,
  GameLogReq,
  StoredGameLog,
} from './types';

/** One Redis stream per UTC day: `gamelog:<yyyy-mm-dd>`. */
const GAME_LOG_GROUP = 'gamelog';

/** How long a day of logs is kept after its last event. */
export const GAME_LOG_TTL_S = 90 * 24 * 60 * 60;

const dayKey = (date: string) => `${GAME_LOG_GROUP}:${date}`;

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (time: number) => new Date(time).toISOString().slice(0, 10);

const today = () => utcDay(Date.now());

/**
 * Stores a game event with who sent it. Answers the entry's id, `null` when
 * Redis failed.
 */
export async function addGameLog(
  log: GameLogReq,
  user: UserDTO | undefined,
  request: ClientRequestInfo,
) {
  const at = new Date().toISOString();

  const entry: GameLogEntry = {
    ...log,
    at,
    user: user
      ? {
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          country: user.country,
          admin: user.admin,
        }
      : null,
    request,
  };

  return appendToStream(
    dayKey(at.slice(0, 10)),
    { data: JSON.stringify(entry) },
    GAME_LOG_TTL_S,
  );
}

function parseEntry(id: string, data: string | undefined) {
  if (!data) {
    return null;
  }

  try {
    return { id, ...(JSON.parse(data) as GameLogEntry) } as StoredGameLog;
  } catch (e) {
    console.error(`Unreadable game log ${id}`, e);
    return null;
  }
}

/**
 * One day of events, newest first, a batch at a time. `null` when Redis
 * failed.
 */
export async function getGameLogs({
  date = today(),
  limit,
  cursor,
}: GameLogQuery): Promise<GameLogPage | null> {
  // One more than asked tells whether there is a next batch.
  const [entries, total] = await Promise.all([
    readStreamNewestFirst(dayKey(date), { count: limit + 1, before: cursor }),
    streamLength(dayKey(date)),
  ]);

  if (!entries || total === null) {
    return null;
  }

  const batch = entries.slice(0, limit);

  return {
    items: batch
      .map(({ id, message }) => parseEntry(id, message.data))
      .filter(entry => entry !== null),
    nextCursor: entries.length > limit ? (batch.at(-1)?.id ?? null) : null,
    total,
  };
}

function loggedBy(userId: string, data: string | undefined) {
  if (!data) {
    return false;
  }

  try {
    return (JSON.parse(data) as GameLogEntry).user?.id === userId;
  } catch {
    return false;
  }
}

/**
 * Erases every event a user was signed in for, from each day still kept:
 * part of deleting their account. Answers how many it removed, `null` when
 * Redis failed on some day (the days it reached are erased all the same).
 */
export async function deleteUserGameLogs(userId: string) {
  const now = Date.now();
  // One day more than the retention: a day expires after its *last* event.
  const days = Math.ceil((GAME_LOG_TTL_S * 1000) / DAY_MS) + 1;
  let removed = 0;
  let failed = false;

  for (let day = 0; day <= days; day++) {
    const count = await deleteStreamEntries(
      dayKey(utcDay(now - day * DAY_MS)),
      fields => loggedBy(userId, fields.data),
    );

    if (count === null) {
      failed = true;
    } else {
      removed += count;
    }
  }

  return failed ? null : removed;
}
