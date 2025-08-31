import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import Game from '@/modules/daily-guess/components/game';
import { GameProvider } from '@/modules/daily-guess/hooks/use-game';

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <main className='pt-8'>
      <h2
        className={`${dongle.className} mx-7 text-4xl md:text-7xl text-center`}
      >
        {t('title')}
      </h2>
      <section className='mt-6 md:mt-16 flex justify-center'>
        <div className='md:min-w-2xl max-w-[90dvw] md:w-4xl'>
          <GameProvider type='daily'>
            <Game />
          </GameProvider>
        </div>
      </section>
    </main>
  );
}
