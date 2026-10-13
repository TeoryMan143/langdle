'use client';

import { useSyncExternalStore } from 'react';

const SNOOZE_KEY = 'langdle:app-install-snoozed-at';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Android phones only: tablets and iPhones cannot install the APK. */
export function isAndroidPhone(userAgent: string) {
  return /Android/i.test(userAgent) && /Mobile/i.test(userAgent);
}

const noSubscribe = () => () => {};

/** False on the server and on the first client render, so the markup matches. */
export function useAndroidPhone() {
  return useSyncExternalStore(
    noSubscribe,
    () => isAndroidPhone(navigator.userAgent),
    () => false,
  );
}

export function getAndroidAppUrl() {
  return process.env.NEXT_PUBLIC_ANDROID_APP_URL || undefined;
}

/** The prompt stays closed for a week after it is dismissed or used. */
export function isPromptSnoozed(now = Date.now()) {
  try {
    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY));
    return now - snoozedAt < SNOOZE_MS;
  } catch {
    // Blocked storage (private mode): the prompt simply shows again.
    return false;
  }
}

export function snoozePrompt() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // Blocked storage: nothing to remember, the prompt shows next visit.
  }
}
