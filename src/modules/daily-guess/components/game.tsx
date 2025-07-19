'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceValue, useLocalStorage } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import Send from '@/core/components/icons/send';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
import { cn, getUTCDateString } from '@/core/lib/utils';
import { useAuth } from '@/modules/auth/context';
import LangImage from '@/modules/lang-data/components/lang-image';
import { checkGuess } from '../actions';
import { LanguageGuess } from '../types';
import GuessesTable from './guesses-table';
import QueryRes from './query-res';
import WinDialog from './win-dialog';

type SavedGuesses = {
  date: string;
  guesses: LanguageGuess[];
  dailyLang: Language | null;
};

const MAX_ATTEMPTS = 5;

function Game() {
  const [query, setQuery] = useDebounceValue('', 400);

  const { data, isError, isLoading } = useLang({
    action: 'search',
    query,
  });

  const { data: allLangs, isLoading: allLoading } = useLang({
    action: 'get',
    onlyActives: true,
  });

  const [localGuesses, setLocalGuesses] = useLocalStorage<SavedGuesses>(
    'day-save',
    { date: 'invalid', guesses: [], dailyLang: null },
  );

  const { session } = useAuth();

  const [guesses, setGuesses] = useState<LanguageGuess[]>([]);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [animateError, setAnimateError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailyLang, setDailyLang] = useState<Language | null>(null);

  const hasRetrievedSave = useRef(false);

  useEffect(() => {
    if (
      !hasRetrievedSave.current &&
      !session &&
      localGuesses.date === getUTCDateString()
    ) {
      hasRetrievedSave.current = true;
      setGuesses(localGuesses.guesses);
      setDailyLang(localGuesses.dailyLang);
      console.log('GOT');
    } else if (
      !hasRetrievedSave.current &&
      !session &&
      localGuesses.date !== getUTCDateString()
    ) {
      hasRetrievedSave.current = true;
    }
  }, [session, localGuesses]);

  useEffect(() => {
    if (hasRetrievedSave.current && !session && !localGuesses.dailyLang) {
      setLocalGuesses({
        date: getUTCDateString(),
        guesses,
        dailyLang: null,
      });
    }
  }, [guesses, setLocalGuesses, session, localGuesses.dailyLang]);

  useEffect(() => {
    if (inputRef.current && selectedLang) {
      inputRef.current.value = selectedLang.name;
    }
  }, [selectedLang]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleGuess = async () => {
    if (guesses.length >= MAX_ATTEMPTS) {
      return toast.error('No attempts left');
    }

    if (dailyLang) {
      return toast.info('You already guessed');
    }

    if (!selectedLang) {
      setAnimateError(true);
      setTimeout(() => setAnimateError(false), 4000);
      return;
    }

    const res = await checkGuess(selectedLang.id);

    if (!res.success) {
      return toast.error(res.error);
    }

    const matching = res.result;

    if ('guessed' in matching) {
      setLocalGuesses({
        date: getUTCDateString(),
        guesses,
        dailyLang: matching.guessed,
      });
      setDailyLang(matching.guessed);
      return toast.success(
        `Congratulations you guessed the language: ${matching.guessed.name}`,
      );
    }

    setGuesses(prev => [...prev, { ...selectedLang, matching }]);
    setSelectedLang(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const t = useTranslations('Game');

  return (
    <div className='space-y-6 flex flex-col items-center w-full'>
      {dailyLang && <WinDialog lang={dailyLang} />}
      <div className='md:h-14 md:w-[95%]'>
        <search className='h-full flex items-center gap-2'>
          <div className='h-full flex-1 relative group/langs'>
            <motion.div
              animate={animateError ? { y: [0, -50, -50, 0] } : {}}
              transition={{
                duration: 4,
                times: [0, 0.05, 0.95, 1],
                ease: 'easeInOut',
              }}
              className={cn(
                'hidden w-[90%] md:w-auto text-xs md:text-base absolute text-red-600 rounded-lg shadow-xl show-animation md:px-4 h-[80%] place-items-center left-1/2 -translate-x-1/2 z-[5] border-2 bg-white',
                { grid: animateError },
              )}
            >
              <p>{t('selectToGuess')}</p>
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
              langs={query === '' ? allLangs : data}
              loading={isLoading || allLoading}
              error={isError}
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
        {dailyLang ? (
          <>
            <p>{t('dailyLang')}:</p>
            <LangImage code={dailyLang.id} />
            <p>
              {dailyLang.name} {dailyLang.exonym && `(${dailyLang.exonym})`}
            </p>
          </>
        ) : (
          <p>
            {t('attLeft')}: {MAX_ATTEMPTS - guesses.length}
          </p>
        )}
      </div>
      <GuessesTable guesses={guesses} />
    </div>
  );
}
export default Game;
