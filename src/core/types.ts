import type { z } from 'zod';
import type { COUNTRIES } from './lib/countries';
import type { featureStatuses, langFeatures } from './lib/features';
import type { langDataSchema } from './schemas/lang';

/* -------------------------------------------------------------------------- */
/*                               Language domain                              */
/* -------------------------------------------------------------------------- */

export type LangFeatures = (typeof langFeatures)[number];
export type FeatureStatus = (typeof featureStatuses)[number];

export type LanguageData = z.TypeOf<typeof langDataSchema>;
export type Language = { id: string } & LanguageData;

export type SelectMenuOption = (typeof COUNTRIES)[number];

/* -------------------------------------------------------------------------- */
/*                              Action contracts                              */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = undefined, E = string> =
  | ActionSuccess<T>
  | ActionError<E>;

export type ActionSuccess<T> = {
  success: true;
  result: T;
  error?: never;
};

export type ActionError<E> = {
  success: false;
  error: E;
  result?: never;
};

/* -------------------------------------------------------------------------- */
/*                                REST contracts                              */
/* -------------------------------------------------------------------------- */

/**
 * Every error response of the REST API has this shape, so any client (actions,
 * the Flutter app, …) can rely on `key` for i18n and `message` for debugging.
 */
export type ApiErrorBody<E = unknown> = {
  key: string;
  message: string;
  errors?: E;
};

export type ApiRequestOptions = {
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
  /** JSON serializable payload. */
  body?: unknown;
  /** Sends the current session token as a `Bearer` header. */
  auth?: boolean;
  searchParams?: Record<string, string | string[] | number | boolean>;
  cache?: RequestCache;
  /** Overrides the token taken from the session cookie. */
  token?: string;
};
