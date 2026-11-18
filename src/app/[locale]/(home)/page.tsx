export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import { siteUrl } from '@/core/lib/seo';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getDailyLanguage } from '@/modules/lang-guess/actions';
import Game from '@/modules/lang-guess/components/game';
import RandomLink from '@/modules/lang-guess/components/random-link';
import { GameProvider } from '@/modules/lang-guess/hooks/use-game';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * schema.org data for search engines: the WebSite node is what Google reads
 * the site name ("Langdle") from, the VideoGame node describes the game.
 */
async function StructuredData() {
  const t = await getTranslations('Metadata');
  const url = siteUrl();

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Langdle',
        alternateName: ['Langdle game', 'Wordle for languages'],
        url,
        inLanguage: routing.locales,
      },
      {
        '@type': ['VideoGame', 'WebApplication'],
        name: 'Langdle',
        url,
        description: t('description'),
        genre: ['Puzzle', 'Word game'],
        gamePlatform: ['Web browser', 'Android'],
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        inLanguage: routing.locales,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ],
  };

  return (
    <script
      type='application/ld+json'
      // Escape `<` so no translated string can close the script tag.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be inlined as raw JSON.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export default async function Home() {
  const t = await getTranslations('Home');
  const tHowTo = await getTranslations('HowToPlayPage');
  const tLangRes = await getDailyLanguage();

  if (!tLangRes.success) {
    return <p>Error</p>;
  }

  return (
    <main className='pt-8'>
      <StructuredData />
      <h2
        className={`${dongle.className} mx-7 text-4xl md:text-7xl text-center`}
      >
        {t('title')}
      </h2>
      <p className='mx-auto mt-2 max-w-2xl px-7 text-center text-sm leading-relaxed text-foreground/80 md:text-base'>
        {t('intro')}{' '}
        <Link className='font-heading underline' href='/howtoplay'>
          {tHowTo('title')}
        </Link>
      </p>
      <div className='mt-4 grid place-content-center'>
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
