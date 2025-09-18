import { getTranslations } from 'next-intl/server';
import { getRandomLanguage } from '@/core/actions/langs';
import { dongle } from '@/core/lib/fonts';
import Game from '@/modules/lang-guess/components/game';
import RandomLink from '@/modules/lang-guess/components/random-link';
import { GameProvider } from '@/modules/lang-guess/hooks/use-game';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const t = await getTranslations('Game');
  const tLangRes = await getRandomLanguage();

  if (!tLangRes.success) {
    return <p>Error</p>;
  }

  return (
    <main className='pt-8'>
      <h2
        className={`${dongle.className} mx-7 text-4xl md:text-7xl text-center`}
      >
        {t('guessRandom')}
      </h2>
      <div className='grid place-content-center'>
        <RandomLink />
      </div>
      <section className='mt-6 md:mt-10 flex justify-center'>
        <div className='md:min-w-2xl max-w-[90dvw] md:w-4xl'>
          <GameProvider targetLang={tLangRes.result} type='random'>
            <Game />
          </GameProvider>
        </div>
      </section>
    </main>
  );
}
