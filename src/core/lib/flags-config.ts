/*
 * What the web, the API and the app agree on about flags. Free of `sharp`, so
 * client components can import it.
 */

/** The size every flag is served at, the one of the flags in `public/flags`. */
export const FLAG_WIDTH = 455;
export const FLAG_HEIGHT = 304;

export const FLAG_MAX_BYTES = 2 * 1024 * 1024;
export const FLAG_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Bucket key of a published language flag. */
export const flagKey = (code: string) => `flags/${code}.webp`;

/** Bucket key of the flag sent with a language request, until it is reviewed. */
export const requestFlagKey = (id: string) => `language-requests/${id}.webp`;
