import { z } from 'zod';
import { langFeatures } from '@/core/lib/features';
import { routing } from '@/i18n/routing';

/** ISO 639-1 or 639-3 code, the way languages are keyed (`es`, `hak`). */
export const LANG_CODE_PATTERN = /^[a-z]{2,3}$/;

/**
 * The form needs localized messages, the API does not, hence the factory. The
 * flag travels apart, as the `flag` file of the multipart body.
 */
export function createLanguageRequestSchema(t: (key: string) => string) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .toLowerCase()
        .regex(LANG_CODE_PATTERN, t('codeFormat')),
      name: z.string().trim().min(1, t('nameRequired')).max(60),
      exonym: z
        .string()
        .trim()
        .max(60)
        .optional()
        .transform(value => (value ? value : undefined)),
      features: z.enum(langFeatures).array(),
      partial: z.enum(langFeatures).array(),
      description: z.string().trim().min(1, t('descriptionRequired')).max(1000),
    })
    .refine(
      data => !data.features.some(feature => data.partial.includes(feature)),
      { message: t('featureTwice'), path: ['partial'] },
    );
}

export const languageRequestSchema = createLanguageRequestSchema(key => key);

/**
 * What the API accepts as the `data` field: the form plus the locale the
 * resolution email will be written in (the action adds it).
 */
export const languageRequestBodySchema = languageRequestSchema.and(
  z.object({ locale: z.enum(routing.locales).optional() }),
);
