'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table';
import LangImage from '@/modules/lang-data/components/lang-image';
import type { LanguageGuess } from '../types';
import Feature from './feature';

type Props = {
  guesses: LanguageGuess[];
};

function GuessesTable({ guesses }: Props) {
  const t = useTranslations('Game');

  return (
    <Table>
      <TableHeader className='md:text-lg md:h-28'>
        <TableRow>
          <TableHead className='md:w-[144px] text-center font-semibold relative after:h-[80%] after:w-[2px] after:bg-soft-det after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2'>
            {t('lang')}
          </TableHead>
          <TableHead className='font-semibold text-center'>Features</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className='bg-background'>
        {guesses.length === 0 && (
          <TableRow>
            <TableCell> </TableCell>
            <TableCell className='text-center'>Do your first guess!</TableCell>
          </TableRow>
        )}
        {guesses.map(({ id, name, matching, exonym }) => (
          <TableRow key={id}>
            <TableCell className='md:w-[144px] text-center border-r-1 border-soft-det'>
              <LangImage code={id} /> {name} {exonym && `(${exonym})`}
            </TableCell>
            <TableCell className='flex gap-2.5 flex-wrap'>
              {matching.correct.map(f => (
                <Feature key={name + f} id={f} match />
              ))}
              {matching.incorrect.map(f => (
                <Feature key={name + f} id={f} />
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export default GuessesTable;
