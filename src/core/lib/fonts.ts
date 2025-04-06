import { Poppins, Dongle } from 'next/font/google';

export const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
});

export const dongle = Dongle({
  variable: '--font-dongle',
  subsets: ['latin'],
  weight: ['300', '700'],
});