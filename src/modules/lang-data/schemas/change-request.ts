import { z } from 'zod';
import { featureStatuses, langFeatures } from '@/core/lib/features';

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
