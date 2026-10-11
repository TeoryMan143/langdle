import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodType, z } from 'zod';

/**
 * Builds the error shape every endpoint of the API answers with:
 * `{ key, message, errors? }`.
 */
export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  key: string,
  message: string,
  errors?: unknown,
) {
  return c.json(
    { key, message, ...(errors === undefined ? {} : { errors }) },
    status,
  );
}

export const notFound = (c: Context, message = 'Resource not found') =>
  apiError(c, 404, 'notFound', message);

export const forbidden = (c: Context, message = 'Not allowed') =>
  apiError(c, 403, 'notAllowed', message);

export const unknownError = (c: Context, message = 'Unknown error') =>
  apiError(c, 500, 'unknown', message);

type ParsedBody<S extends ZodType> =
  | { success: true; data: z.infer<S>; response?: never }
  | { success: false; data?: never; response: Response };

/**
 * Parses and validates a JSON body. On failure it returns the ready to send
 * `400` response, so handlers only have to forward it.
 */
export async function parseJsonBody<S extends ZodType>(
  c: Context,
  schema: S,
): Promise<ParsedBody<S>> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch (_) {
    return {
      success: false,
      response: apiError(c, 400, 'invalidBody', 'A JSON body is required'),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: apiError(
        c,
        400,
        'invalidData',
        'An error occurred parsing the body data',
        result.error.flatten(),
      ),
    };
  }

  return { success: true, data: result.data };
}
