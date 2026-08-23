import { z } from 'zod';
import { langFeatures } from '@/core/lib/utils';

export function createChangeRequestSchema(t: (key: string) => string) {
  return z.object({
    lang: z.string().min(1),
    feature: z.enum(langFeatures),
    status: z.enum(['present', 'absent', 'partial']),
    description: z.string().min(1, t('descriptionRequired')).max(1000),
  });
}

export const changeRequestSchema = createChangeRequestSchema(
  () => 'Description is required',
);

export type ChangeRequestFormValues = z.infer<typeof changeRequestSchema>;
