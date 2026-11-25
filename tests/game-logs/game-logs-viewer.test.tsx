import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import messages from '@/../messages/en.json';
import GameLogsViewer from '@/modules/game-logs/components/game-logs-viewer';
import type { GameLogPage, StoredGameLog } from '@/modules/game-logs/types';

const base: Omit<StoredGameLog, 'id' | 'event'> = {
  gameId: 'game-1',
  type: 'daily',
  targetLang: 'spa',
  at: '2026-11-25T14:03:09.000Z',
  user: null,
  visitorId: 'visitor-1',
  request: {
    ip: '203.0.113.7',
    country: 'CO',
    city: 'Bogotá',
    latitude: 4.61,
    longitude: -74.08,
  },
  client: { platform: 'web', screen: { width: 1920, height: 1080 } },
};

const page: GameLogPage = {
  items: [
    { ...base, id: '3-0', event: 'win', attempt: 2 },
    {
      ...base,
      id: '2-0',
      event: 'guess',
      guessLang: 'por',
      attempt: 1,
      user: {
        id: 'u1',
        nickname: 'teo',
        email: 'teo@langdle.test',
        country: 'CO',
        admin: false,
      },
    },
  ],
  nextCursor: '2-0',
  total: 7,
};

const render = () =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale='en' timeZone='UTC' messages={messages}>
        <GameLogsViewer
          initialPage={page}
          initialDate='2026-11-25'
          pageSize={2}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

test('lists each event with its player, place and languages', () => {
  const html = render();

  expect(html).toContain('Showing 2 of 2 loaded (7 that day)');
  expect(html).toContain('>Win<');
  expect(html).toContain('bg-emerald-300');
  expect(html).toContain('>Guess<');
  expect(html).toContain('teo');
  expect(html).toContain('Signed out');
  expect(html).toContain('Bogotá, CO · 203.0.113.7');
  expect(html).toContain('attempt 1');
  expect(html).toContain('2:03:09 PM');
});

test('the details hold every stored field and a map link', () => {
  const html = render();

  expect(html).toContain('teo@langdle.test');
  expect(html).toContain('visitor-1');
  expect(html).toContain('1920 × 1080');
  expect(html).toContain('openstreetmap.org/?mlat=4.61&amp;mlon=-74.08');
});

test('offers the next batch while there is one', () => {
  expect(render()).toContain('Show more');
});
