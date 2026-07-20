'use client';

import { motion } from 'framer-motion';
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
import { useGame } from '../hooks/use-game';
import Feature from './feature';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

function GuessesTable() {
  const t = useTranslations('Game');

  const { guesses } = useGame();

  return (
    <Table>
      <TableHeader className='md:text-lg md:h-28'>
        <TableRow>
          <TableHead className='md:w-36 text-center font-semibold relative after:h-[80%] after:w-0.5 after:bg-soft-det after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2'>
            {t('lang')}
          </TableHead>
          <TableHead className='font-semibold text-center'>
            {t('features')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className='bg-background'>
        {guesses.length === 0 && (
          <TableRow>
            <TableCell> </TableCell>
            <TableCell className='text-center'>{t('firstGuess')}</TableCell>
          </TableRow>
        )}
        {guesses.map(({ id, name, matching, exonym }) => (
          <TableRow key={id}>
            <TableCell className='md:w-36 text-center border-r border-soft-det'>
              <LangImage code={id} /> {name} {exonym && `(${exonym})`}
            </TableCell>
            <TableCell>
              <motion.div
                className='flex gap-2.5 flex-wrap'
                variants={containerVariants}
                initial='hidden'
                animate='visible'
              >
                {matching.correct.map(f => (
                  <Feature key={name + f} id={f} match='correct' />
                ))}
                {matching.partial.map(f => (
                  <Feature key={name + f} id={f} match='partial' />
                ))}
                {matching.incorrect.map(f => (
                  <Feature key={name + f} id={f} match='incorrect' />
                ))}
              </motion.div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export default GuessesTable;
