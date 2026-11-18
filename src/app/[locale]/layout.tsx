import type { Metadata } from 'next';
import './globals.css';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';
import Header from '@/core/components/main/header';
import Providers from '@/core/components/main/providers';
import { noto } from '@/core/lib/fonts';
import { routing } from '@/i18n/routing';
import InstallAppDialog from '@/modules/app-install/components/install-app-dialog';
import { auth } from '@/modules/auth/actions';

const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
};

/**
 * Site-wide defaults. Canonicals live on each page: a canonical set here
 * would be inherited by every page and point them all at the home page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const tHome = await getTranslations('Home');
  const t = await getTranslations('Metadata');

  const title = `Langdle – ${tHome('title')}`;
  const description = t('description');

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL),
    title: { default: title, template: '%s | Langdle' },
    description,
    applicationName: 'Langdle',
    keywords: t('keywords').split(', '),
    openGraph: {
      type: 'website',
      siteName: 'Langdle',
      title,
      description,
      locale: OG_LOCALES[locale] ?? OG_LOCALES.en,
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const sessionData = await auth();

  return (
    <html lang={locale}>
      {/* <head>
        <script src='https://unpkg.com/react-scan/dist/auto.global.js' />
      </head> */}
      <body className={`${noto.className} antialiased relative`}>
        <div className='isolate flex flex-col min-h-dvh'>
          <Providers sessionData={sessionData}>
            <NextIntlClientProvider>
              <Toaster />
              <Header />
              <InstallAppDialog />
              <div className='flex-1 py-3 h-full'>{children}</div>
            </NextIntlClientProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
