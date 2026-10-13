import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isAndroidPhone,
  isPromptSnoozed,
  snoozePrompt,
} from '@/modules/app-install/hooks/use-app-install';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('isAndroidPhone', () => {
  it('matches Android phones', () => {
    expect(
      isAndroidPhone(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(true);
  });

  it('ignores desktops, iPhones and Android tablets', () => {
    expect(
      isAndroidPhone(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isAndroidPhone(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
    expect(
      isAndroidPhone(
        'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});

describe('prompt snooze', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  }

  it('is open until the user dismisses it', () => {
    stubStorage();
    expect(isPromptSnoozed()).toBe(false);
  });

  it('stays closed for a week after a dismissal', () => {
    stubStorage();
    snoozePrompt();
    expect(isPromptSnoozed(Date.now() + 6 * DAY_MS)).toBe(true);
    expect(isPromptSnoozed(Date.now() + 8 * DAY_MS)).toBe(false);
  });

  it('opens the prompt when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => snoozePrompt()).not.toThrow();
    expect(isPromptSnoozed()).toBe(false);
  });
});
