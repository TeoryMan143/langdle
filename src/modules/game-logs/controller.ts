import { Hono } from 'hono';
import { readClientInfo } from '@/core/lib/client-info';
import { apiError, parseJsonBody, unknownError } from '@/core/lib/http';
import {
  adminMiddleware,
  authMiddleware,
  optionalAuthMiddleware,
} from '@/modules/auth/middleware';
import { gameLogQuerySchema, gameLogReqSchema } from './schemas/game-log';
import { addGameLog, getGameLogs } from './service';

const gameLogsRouter = new Hono();

/**
 * Records a game event from any player. The client says what happened; the
 * player (when the request is signed) and the IP, browser and location come
 * from the request itself.
 */
gameLogsRouter.post('/game', optionalAuthMiddleware, async c => {
  const parsed = await parseJsonBody(c, gameLogReqSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const id = await addGameLog(
    parsed.data,
    c.get('user'),
    readClientInfo(name => c.req.header(name)),
  );

  if (!id) {
    return unknownError(c, 'The event could not be logged');
  }

  return c.json({ id }, 201);
});

/**
 * One UTC day of events (`?date=`, today by default), newest first, a batch
 * at a time: `?limit=` (1–200, default 50) and the previous `nextCursor` as
 * `?cursor=`.
 */
gameLogsRouter.get('/game', authMiddleware, adminMiddleware, async c => {
  const parsed = gameLogQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return apiError(
      c,
      400,
      'invalidData',
      'Invalid log query',
      parsed.error.flatten(),
    );
  }

  const page = await getGameLogs(parsed.data);

  if (!page) {
    return unknownError(c, 'The logs could not be read');
  }

  return c.json(page);
});

export default gameLogsRouter;
