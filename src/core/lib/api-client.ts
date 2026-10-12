import type {
  ActionResult,
  ApiErrorBody,
  ApiRequestOptions,
} from '@/core/types';
import { actionError, actionSuccess } from './action';
import { getSessionToken } from './session';
import { getErrorMessage } from './utils';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

function buildUrl(
  path: string,
  searchParams: ApiRequestOptions['searchParams'],
) {
  const url = new URL(
    `/api${path.startsWith('/') ? path : `/${path}`}`,
    baseUrl,
  );

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function normalizeError(body: unknown, status: number): ApiErrorBody {
  if (body && typeof body === 'object') {
    const { key, message, errors, formErrors, fieldErrors } = body as Record<
      string,
      unknown
    >;

    // Zod `flatten()` payloads reach us without a key.
    if (!key && !message && (formErrors || fieldErrors)) {
      return {
        key: 'invalidData',
        message: 'Invalid request data',
        errors: body,
      };
    }

    return {
      key: typeof key === 'string' ? key : 'unknown',
      message:
        typeof message === 'string' ? message : `Request failed (${status})`,
      errors,
    };
  }

  return { key: 'unknown', message: `Request failed (${status})` };
}

/**
 * Single entry point used by every server action that talks to our own REST
 * API. It resolves the base url, attaches the session token, parses the body
 * and normalizes failures into an `ActionResult`, so actions stay thin.
 */
export async function apiRequest<T, E = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ActionResult<T, ApiErrorBody<E>>> {
  const {
    method = 'get',
    body,
    auth = false,
    searchParams,
    cache,
    token,
  } = options;

  try {
    const headers: Record<string, string> = {};

    if (auth) {
      const sessionToken = token ?? (await getSessionToken());

      if (!sessionToken) {
        return actionError({
          key: 'notSignedIn',
          message: 'Must be signed in',
        });
      }

      headers.Authorization = `Bearer ${sessionToken}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(buildUrl(path, searchParams), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: cache ?? (method === 'get' ? undefined : 'no-cache'),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const error = normalizeError(payload, res.status);
      console.error(`[api] ${method.toUpperCase()} ${path}`, error);
      return actionError(error as ApiErrorBody<E>);
    }

    return actionSuccess(payload as T);
  } catch (e) {
    console.error(`[api] ${method.toUpperCase()} ${path}`, e);
    return actionError({
      key: 'unknown',
      message: getErrorMessage(e),
    });
  }
}
