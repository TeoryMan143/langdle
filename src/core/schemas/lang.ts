import { z } from 'zod';
import { langFeatures } from '@/core/lib/features';

/** A point where a language is spoken (WALS gives one, editors add more). */
export const langLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const langDataSchema = z.object({
  name: z.string().min(1).trim(),
  exonym: z.string().min(1).trim().optional(),
  features: z.enum(langFeatures).array(),
  active: z.boolean(),
  partial: z.enum(langFeatures).array(),
  searchParams: z.string().array(),
  /*
   * The game's hints: distance and direction, then relatedness. A language
   * spoken far apart (Spanish in Spain and the Americas) has one point per
   * region; the hint measures between the closest two.
   */
  locations: langLocationSchema.array().min(1).max(30).optional(),
  /** Top level family, the way WALS names it ("Indo-European"). */
  family: z.string().min(1).trim().optional(),
  /** The branch below the family ("Romance"). */
  genus: z.string().min(1).trim().optional(),
  /**
   * Share of the catalogue some source described when the language was
   * imported (0–1); the review queue ranks the inactive languages by it.
   */
  coverage: z.number().min(0).max(1).optional(),
});

/**
 * Fields a client that only edits features may not know about (an older app,
 * a script): `PUT /lang/:id` keeps the stored ones when the body leaves them
 * out, so an edit never erases them.
 */
export const langManagedFields = [
  'locations',
  'family',
  'genus',
  'coverage',
] as const;

/**
 * The body of `PUT /lang/:id`: the language data, where a managed field set to
 * `null` is removed (left out, it is kept).
 */
export const langDataBodySchema = langDataSchema.extend({
  locations: langDataSchema.shape.locations.nullable(),
  family: langDataSchema.shape.family.nullable(),
  genus: langDataSchema.shape.genus.nullable(),
  coverage: langDataSchema.shape.coverage.nullable(),
});
