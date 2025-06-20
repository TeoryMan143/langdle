import { Dongle, Noto_Sans } from 'next/font/google';

export const noto = Noto_Sans({
  variable: '--font-noto',
  weight: ['200', '300', '400', '500', '600', '700'],
  preload: false,
});

export const dongle = Dongle({
  variable: '--font-dongle',
  weight: ['300', '700'],
  subsets: ['latin-ext'],
});
