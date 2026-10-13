import { Hono } from 'hono';
import { COUNTRIES } from '@/core/lib/countries';
import { featureStatuses, groupedLangFeatures } from '@/core/lib/features';

/**
 * Static catalogues the clients build their forms from, so the mobile app
 * never keeps its own copy. Labels stay client side, keyed by these ids.
 */
const metaRouter = new Hono();

metaRouter.get('/features', c =>
  c.json({ groups: groupedLangFeatures, statuses: featureStatuses }),
);

metaRouter.get('/countries', c => c.json(COUNTRIES));

export default metaRouter;
