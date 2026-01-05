'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Loading from '@/core/components/icons/loading';
import Send from '@/core/components/icons/send';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { cn } from '@/core/lib/utils';
import LangImage from '@/modules/lang-data/components/lang-image';
import { useGame } from '../hooks/use-game';
import FailDialog from './fail-dialog';
import GuessesTable from './guesses-table';
import QueryRes from './query-res';
import WinDialog from './win-dialog';

function Game() {
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Game');

  const {
    MAX_ATTEMPTS,
    targetLang,
    guesses,
    queryError,
    setQuery,
    setSelectedLang,
    inputRef,
    handleGuess,
    hasGuessed,
    type,
  } = useGame();

  return (
    <div className='space-y-6 flex flex-col items-center w-full'>
      {hasGuessed && <WinDialog lang={targetLang} />}
      {!hasGuessed && guesses.length >= 5 && <FailDialog lang={targetLang} />}

      <div className='md:h-14 md:w-[95%]'>
        <search className='h-full flex items-center gap-2'>
          <div className='h-full flex-1 relative group/langs'>
            <motion.div
              animate={queryError ? { y: [0, -50, -50, 0] } : {}}
              transition={{
                duration: 4,
                times: [0, 0.05, 0.95, 1],
                ease: 'easeInOut',
              }}
              className={cn(
                'hidden w-[90%] md:w-auto text-xs md:text-base absolute text-red-600 rounded-lg shadow-xl show-animation md:px-4 h-[80%] place-items-center left-1/2 -translate-x-1/2 z-[5] border-2 bg-white',
                { grid: !!queryError },
              )}
            >
              <p>{queryError}</p>
            </motion.div>

            <Input
              onChange={e => {
                setQuery(e.target.value.toLowerCase().trim());
                setSelectedLang(null);
              }}
              className='relative text-center h-full bg-white z-10'
              placeholder={t('typeGuess')}
              ref={inputRef}
            />
            <QueryRes
              onSelect={lang => {
                setSelectedLang(lang);
                if (
                  document.activeElement &&
                  document.activeElement instanceof HTMLElement
                ) {
                  document.activeElement.blur();
                }
              }}
            />
          </div>
          <Button
            className='p-1 md:px-4 md:py-2 md:h-full'
            onClick={async () => {
              setLoading(true);
              await handleGuess();
              setLoading(false);
            }}
            disabled={loading}
          >
            {loading ? <Loading /> : t('guess')}
            <Send />
          </Button>
        </search>
      </div>
      <div className='text-gray-600 flex justify-center items-center gap-2'>
        {MAX_ATTEMPTS - guesses.length === 0 || hasGuessed ? (
          <>
            <p>{type === 'daily' ? t('dailyLang') : t('randomLang')}:</p>
            <LangImage code={targetLang.id} />
            <p>
              {targetLang.name} {targetLang.exonym && `(${targetLang.exonym})`}
            </p>
          </>
        ) : (
          <p>
            {t('attLeft')}: {MAX_ATTEMPTS - guesses.length}
          </p>
        )}
      </div>
      <GuessesTable />
    </div>
  );
}
export default Game;
