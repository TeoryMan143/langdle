import { z } from 'zod';

/**
 * The messages of each invalid field of a `safeParse` result, the same
 * `fieldErrors` the API answers. Empty when the input was valid.
 */
export function fieldErrorsOf(result: {
  error?: z.ZodError;
}): Record<string, string[] | undefined> {
  return result.error ? z.flattenError(result.error).fieldErrors : {};
}
