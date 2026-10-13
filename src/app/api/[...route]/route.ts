import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import authRouter from '@/modules/auth/controller';
import langDataRouter from '@/modules/lang-data/controller';
import langGuessRouter from '@/modules/lang-guess/controller';
import metaRouter from '@/modules/meta/controller';
import userProfileRouter from '@/modules/user-profile/controller';

/**
 * Single entry point of the REST API. Every module exposes its endpoints from
 * its own `controller.ts` and gets mounted here under its prefix.
 */
const api = new Hono().basePath('/api');

api.route('/auth', authRouter);
api.route('/lang', langDataRouter);
api.route('/guess', langGuessRouter);
api.route('/user', userProfileRouter);
api.route('/meta', metaRouter);

export const GET = handle(api);
export const POST = handle(api);
export const PUT = handle(api);
export const PATCH = handle(api);
export const DELETE = handle(api);
