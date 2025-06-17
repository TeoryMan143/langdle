import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import langFeaturesHandler from '../modules/lang-features/controller';
import cron from 'node-cron';
import { db } from '@/core/database/relational/config';
import { langTokenTable } from '@/core/database/relational/tables';
import { lt } from 'drizzle-orm';
import { cors } from 'hono/cors';

const api = new Hono().basePath('/api');

api.use('/api/*', cors());
api.route('/lang', langFeaturesHandler);

export const GET = handle(api);
export const POST = handle(api);
export const PUT = handle(api);

cron.schedule('*/10 * * * *', async () => {
  try {
    await db
      .delete(langTokenTable)
      .where(lt(langTokenTable.expiresAt, new Date()));
    console.log('Expired language tokens deleted successfully');
  } catch (e) {
    console.error(e);
  }
});
