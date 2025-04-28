import type { Metadata } from 'next';
import './globals.css';
import Header from '@/core/components/main/header';
import { noto } from '@/core/lib/fonts';
import { Toaster } from 'sonner';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

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

  return (
    <html lang={locale}>
      {/* <head>
        <script
          crossOrigin='anonymous'
          src='//unpkg.com/react-scan/dist/auto.global.js'
        />
      </head> */}
      <body className={`${noto.className} antialiased flex flex-col min-h-dvh`}>
        <Toaster />
        <Header />
        <div className='flex-1 py-3'>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
