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
