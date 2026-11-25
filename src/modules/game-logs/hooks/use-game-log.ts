'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';
import { randomId } from '@/core/lib/utils';
import { logGameEvent } from '../actions';
import type { GameLogClient, GameLogEvent, GameLogReq } from '../types';

const VISITOR_KEY = 'visitor-id';

/** The id this browser keeps across games; none when storage is blocked. */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);

    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }

    return id;
  } catch {
    return undefined;
  }
}

function clientContext(locale: string): GameLogClient {
  return {
    platform: 'web',
    locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffsetMinutes: -new Date().getTimezoneOffset(),
    languages: [...navigator.languages].slice(0, 10),
    screen: { width: screen.width, height: screen.height },
    viewport: { width: innerWidth, height: innerHeight },
    pixelRatio: devicePixelRatio,
    referrer: document.referrer.slice(0, 512) || undefined,
    path: location.pathname.slice(0, 256),
  };
}

type GameLogDetails = Pick<
  GameLogReq,
  'gameId' | 'guessLang' | 'attempt' | 'resumed'
>;

/**
 * Reports the events of a game to `POST /api/logs/game`. Fire and forget: a
 * log that fails is dropped and never gets in the way of the game.
 */
export function useGameLog(type: GameLogReq['type'], targetLang: string) {
  const locale = useLocale();

  return useCallback(
    (event: GameLogEvent, details: GameLogDetails) => {
      logGameEvent({
        event,
        type,
        targetLang,
        visitorId: visitorId(),
        client: clientContext(locale),
        ...details,
      }).catch(() => {});
    },
    [locale, targetLang, type],
  );
}
