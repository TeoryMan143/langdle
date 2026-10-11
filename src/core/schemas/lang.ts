import { z } from 'zod';
import { langFeatures } from '@/core/lib/features';

export const langDataSchema = z.object({
  name: z.string().min(1).trim(),
  exonym: z.string().min(1).trim().optional(),
  features: z.enum(langFeatures).array(),
  active: z.boolean(),
  partial: z.enum(langFeatures).array(),
  searchParams: z.string().array(),
});
