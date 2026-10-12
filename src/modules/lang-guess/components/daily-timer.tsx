'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The daily cron in `vercel.json` runs at 00:00 UTC. */
function getMsUntilReset() {
  return DAY_MS - (Date.now() % DAY_MS);
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function DailyTimer() {
  const t = useTranslations('Game');
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(getMsUntilReset());
    const id = setInterval(() => setRemaining(getMsUntilReset()), 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <p className='text-sm text-gray-500'>
      {t('nextLang')}:{' '}
      <span className='font-mono tabular-nums'>
        {remaining === null ? '--:--:--' : formatTime(remaining)}
      </span>
    </p>
  );
}
export default DailyTimer;
