import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/main/Header';
import { poppins } from '@/lib/fonts';

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
