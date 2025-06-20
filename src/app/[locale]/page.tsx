import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import Game from '@/modules/daily-guess/components/game';

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <main className='pt-8'>
      <h2 className={`${dongle.className} text-4xl md:text-7xl text-center`}>
        {t('title')}
      </h2>
      <section className='mt-6 md:mt-16 flex justify-center'>
        <div className='md:min-w-2xl max-w-[90dvw] md:max-w-4xl'>
          <Game />
        </div>
      </section>
    </main>
  );
}
