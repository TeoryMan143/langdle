import type { Metadata } from 'next';
import './globals.css';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import Header from '@/core/components/main/header';
import Providers from '@/core/components/main/providers';
import { noto } from '@/core/lib/fonts';
import { routing } from '@/i18n/routing';
import { auth } from '@/modules/auth/actions';

export const metadata: Metadata = {
  title: 'Langdle',
  description: 'Guess the language!',
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const sessionData = await auth();

  return (
    <html lang={locale}>
      {/* <head>
        <script src='https://unpkg.com/react-scan/dist/auto.global.js' />
      </head> */}
      <body className={`${noto.className} antialiased flex flex-col min-h-dvh`}>
        <Providers sessionData={sessionData}>
          <NextIntlClientProvider>
            <Toaster />
            <Header />
            <div className='flex-1 py-3'>{children}</div>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
