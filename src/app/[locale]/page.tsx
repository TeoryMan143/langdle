import { getTranslations } from 'next-intl/server';

import { dongle } from '@/core/lib/fonts';
import { getDailyLanguage } from '@/modules/lang-guess/actions';
import Game from '@/modules/lang-guess/components/game';
import { GameProvider } from '@/modules/lang-guess/hooks/use-game';
import RandomLink from '../../modules/lang-guess/components/random-link';

export default async function Home() {
  const t = await getTranslations('Home');
  const tLangRes = await getDailyLanguage();

  if (!tLangRes.success) {
    return <p>Error</p>;
  }

  return (
    <main className='pt-8'>
      <h2
        className={`${dongle.className} mx-7 text-4xl md:text-7xl text-center`}
      >
        {t('title')}
      </h2>
      <div className='grid place-content-center'>
        <RandomLink />
      </div>
      <section className='mt-6 md:mt-10 flex justify-center'>
        <div className='md:min-w-2xl max-w-[90dvw] md:w-4xl'>
          <GameProvider targetLang={tLangRes.result} type='daily'>
            <Game />
          </GameProvider>
        </div>
      </section>
    </main>
  );
}
