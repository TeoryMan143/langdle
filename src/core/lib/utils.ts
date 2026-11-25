import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUTCDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[getRandomInt(0, items.length - 1)];
}

/**
 * A random 32 hex characters id. `crypto.randomUUID` only exists on https and
 * localhost pages; `getRandomValues` works everywhere.
 */
export function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalizes anything thrown into a message usable as an `ActionResult` error.
 */
export function getErrorMessage(error: unknown, fallback = 'unknown') {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
