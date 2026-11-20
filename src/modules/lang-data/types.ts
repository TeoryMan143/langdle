import type { LangFeatures, Language } from '@/core/types';

/* -------------------------------------------------------------------------- */
/*                              Catalogue paging                              */
/* -------------------------------------------------------------------------- */

/** A language as pickers search it (`GET /lang/names`): no features. */
export type LanguageName = {
  id: string;
  name: string;
  exonym?: string;
  searchParams: string[];
};

/** What `useLangSearch` gives a picker: the matches, best first. */
export type LangSearchResult = {
  data: LanguageName[] | undefined;
  error: Error | null;
  isLoading: boolean;
};

/** The orders `GET /lang/page` lists the catalogue in (`?sort=`). */
export const languagePageSorts = ['name', 'coverage'] as const;
export type LanguagePageSort = (typeof languagePageSorts)[number];

/** Which batch to read: the parsed `GET /lang/page` query, cursor still opaque. */
export type LanguagePageOptions = {
  limit: number;
  cursor?: string;
  /** Only the playable (`true`) or the unplayable (`false`) languages. */
  active?: boolean;
  sort?: LanguagePageSort;
  query?: string;
};

/** The same options for the clients, which may leave the limit to the API. */
export type LanguagePageParams = Partial<LanguagePageOptions>;

/**
 * One batch of the catalogue, sorted by name. `nextCursor` is opaque: send it
 * back as `?cursor=` for the next batch; `null` means this was the last one.
 * `total` counts every language matching the filters, not only this page.
 */
export type LanguagePage = {
  items: Language[];
  nextCursor: string | null;
  total: number;
};

export type LanguagePageResult =
  | { success: true; page: LanguagePage }
  | { success: false; key: 'invalidCursor' | 'unknown' };

/** The counters the atlas shows above the catalogue. */
export type LanguagesSummary = {
  languages: number;
  activeLanguages: number;
  activeFeatures: number;
  partialFeatures: number;
};

/* -------------------------------------------------------------------------- */
/*                                  Editors                                   */
/* -------------------------------------------------------------------------- */

/** A feature as the editors' three-way picker shows it. */
export type FeatureState = 'notPresent' | 'partial' | 'present';
export type FeatureStates = Record<LangFeatures, FeatureState>;

/** The place fields as typed: coordinates stay text until the form is saved. */
export type PlaceDraft = {
  family: string;
  genus: string;
  locations: Array<{ lat: string; lng: string }>;
};
