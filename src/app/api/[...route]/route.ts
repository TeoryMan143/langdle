import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import dailyGuessRouter from '../modules/daily-guess/controller';
import langFeaturesHandler from '../modules/lang-features/controller';

const api = new Hono().basePath('/api');

api.route('/lang', langFeaturesHandler);
api.route('/guess', dailyGuessRouter);

export const GET = handle(api);
export const POST = handle(api);
export const PUT = handle(api);
