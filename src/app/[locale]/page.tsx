import { dongle } from '@/core/lib/fonts';
import Game from '@/modules/daily-guess/components/game';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <main className='pt-8'>
      <h2 className={`${dongle.className} text-7xl text-center`}>
        {t('title')}
      </h2>
      <section className='mt-16 flex justify-center'>
        <div className='min-w-2xl max-w-4xl'>
          <Game />
        </div>
      </section>
    </main>
  );
}
