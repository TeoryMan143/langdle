import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import jobs from '@/core/lib/jobs';
import dailyGuessRouter from '../modules/daily-guess/controller';
import langFeaturesHandler from '../modules/lang-features/controller';

const api = new Hono().basePath('/api');

api.route('/lang', langFeaturesHandler);
api.route('/daily', dailyGuessRouter);

export const GET = handle(api);
export const POST = handle(api);
export const PUT = handle(api);

jobs();
