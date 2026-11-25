import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import authRouter from '@/modules/auth/controller';
import gameLogsRouter from '@/modules/game-logs/controller';
import langDataRouter from '@/modules/lang-data/controller';
import langGuessRouter from '@/modules/lang-guess/controller';
import langPermissionsRouter, {
  langPermissionsJobsRouter,
} from '@/modules/lang-permissions/controller';
import {
  changeRequestsRouter,
  languageRequestsRouter,
} from '@/modules/lang-requests/controller';
import metaRouter from '@/modules/meta/controller';
import userProfileRouter from '@/modules/user-profile/controller';

/**
 * Single entry point of the REST API. Every module exposes its endpoints from
 * its own `controller.ts` and gets mounted here under its prefix.
 */
const api = new Hono().basePath('/api');

api.route('/auth', authRouter);
// The modules under `/lang` go before it: its `/:id` would answer their paths.
api.route('/lang/permissions', langPermissionsRouter);
api.route('/lang/jobs', langPermissionsJobsRouter);
api.route('/lang/change-requests', changeRequestsRouter);
api.route('/lang/language-requests', languageRequestsRouter);
api.route('/lang', langDataRouter);
api.route('/guess', langGuessRouter);
api.route('/user', userProfileRouter);
api.route('/meta', metaRouter);
api.route('/logs', gameLogsRouter);

export const GET = handle(api);
export const POST = handle(api);
export const PUT = handle(api);
export const PATCH = handle(api);
export const DELETE = handle(api);
