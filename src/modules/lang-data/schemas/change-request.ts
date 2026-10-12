import { z } from 'zod';
import { featureStatuses, langFeatures } from '@/core/lib/features';
import { routing } from '@/i18n/routing';

/**
 * The form needs localized messages, the API does not, hence the factory.
 */
export function createChangeRequestSchema(t: (key: string) => string) {
  return z.object({
    lang: z.string().min(1),
    feature: z.enum(langFeatures),
    status: z.enum(featureStatuses),
    description: z.string().min(1, t('descriptionRequired')).max(1000),
  });
}

export const changeRequestSchema = createChangeRequestSchema(
  () => 'Description is required',
);

/**
 * What the API accepts: the form plus the locale the resolution email will be
 * written in (the action adds it, other clients may omit it).
 */
export const changeRequestBodySchema = changeRequestSchema.extend({
  locale: z.enum(routing.locales).optional(),
});

export function createRejectChangeRequestSchema(t: (key: string) => string) {
  return z.object({
    reason: z.string().trim().min(1, t('reasonRequired')).max(500),
  });
}

export const rejectChangeRequestSchema = createRejectChangeRequestSchema(
  () => 'A reason is required',
);

export const changeRequestStateSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
]);
