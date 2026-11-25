import type { z } from 'zod';
import type { COUNTRIES } from './lib/countries';
import type { featureStatuses, langFeatures } from './lib/features';
import type { langDataBodySchema, langDataSchema } from './schemas/lang';

/* -------------------------------------------------------------------------- */
/*                               Language domain                              */
/* -------------------------------------------------------------------------- */

export type LangFeatures = (typeof langFeatures)[number];
export type FeatureStatus = (typeof featureStatuses)[number];

export type LanguageData = z.infer<typeof langDataSchema>;
/** What `PUT /lang/:id` accepts: `null` removes a managed field. */
export type LanguageDataBody = z.infer<typeof langDataBodySchema>;
export type LangLocation = NonNullable<LanguageData['locations']>[number];
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
  /** JSON serializable payload, or a `FormData` sent as multipart. */
  body?: unknown;
  /**
   * Sends the current session token as a `Bearer` header. `'optional'` sends
   * it when there is one and goes on anonymously otherwise.
   */
  auth?: boolean | 'optional';
  searchParams?: Record<string, string | string[] | number | boolean>;
  cache?: RequestCache;
  /** Overrides the token taken from the session cookie. */
  token?: string;
  /**
   * Hands the browser's own headers (IP, user agent, location) to the API,
   * which otherwise sees the server running the action as its client. Reads
   * the request headers, so it makes the calling route dynamic.
   */
  forwardClient?: boolean;
};

/**
 * Who sent a request, as its headers tell: the IP, the browser and, on Vercel,
 * where the IP is located. Every field is missing when its header is.
 */
export type ClientRequestInfo = {
  ip?: string;
  userAgent?: string;
  acceptLanguage?: string;
  referer?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};
