import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { getUTCDateString } from '@/core/lib/utils';
import { auth } from '@/modules/auth/actions';
import { getGameLogs } from '@/modules/game-logs/actions';
import GameLogsViewer from '@/modules/game-logs/components/game-logs-viewer';

/** Events per batch. */
const PAGE_SIZE = 50;

async function GameLogsPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect(withNext('/signin', '/data/logs'), RedirectType.replace);
  }

  if (!user.admin) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('GameLogsPage');
  const today = getUTCDateString();
  const pageRes = await getGameLogs({ date: today, limit: PAGE_SIZE });

  if (!pageRes.success) {
    console.error(pageRes.error);
  }

  return (
    <main className='mx-auto mt-5 max-w-6xl space-y-6 px-4 pb-10'>
      <h2 className={`${dongle.className} text-6xl text-center`}>
        {t('title')}
      </h2>
      <p className='text-center text-foreground/80'>{t('intro')}</p>
      <GameLogsViewer
        initialPage={
          pageRes.success
            ? pageRes.result
            : { items: [], nextCursor: null, total: 0 }
        }
        initialDate={today}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}

export default GameLogsPage;
