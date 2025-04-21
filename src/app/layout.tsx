import type { Metadata } from 'next';
import './globals.css';
import Header from '@/core/components/main/header';
import { noto } from '@/core/lib/fonts';

export const metadata: Metadata = {
  title: 'Langdle',
  description: 'Guess the language!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${noto.className} antialiased flex flex-col min-h-dvh`}>
        <Header />
        <div className='flex-1'>{children}</div>
      </body>
    </html>
  );
}
