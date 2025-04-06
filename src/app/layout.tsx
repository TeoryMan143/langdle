import type { Metadata } from 'next';
import './globals.css';
import Header from '@/core/components/main/header';
import { poppins } from '@/core/lib/fonts';

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
      <body className={`${poppins.className} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
