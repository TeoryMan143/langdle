import { createMiddleware } from 'hono/factory';
import { apiError } from '@/core/lib/http';

/**
 * Guards the endpoints triggered by the Vercel cron jobs declared in
 * `vercel.json`.
 */
export const cronMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError(c, 401, 'unauthorized', 'Invalid cron secret');
  }

  await next();
});
