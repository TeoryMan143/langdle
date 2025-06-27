'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceValue } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import Send from '@/core/components/icons/send';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
import { cn } from '@/core/lib/utils';
import { checkGuess } from '../actions';
import { LanguageGuess } from '../types';
import GuessesTable from './guesses-table';
import QueryRes from './query-res';

function Game() {
  const [query, setQuery] = useDebounceValue('', 400);

  const { data, isError, isLoading } = useLang({
    action: 'search',
    query,
  });

  const { data: allLangs } = useLang({
    action: 'get',
    onlyActives: true,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [animateError, setAnimateError] = useState(false);
  const [guesses, setGuesses] = useState<LanguageGuess[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inputRef.current && selectedLang) {
      inputRef.current.value = selectedLang.name;
    }
  }, [selectedLang]);

  const handleGuess = async () => {
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
      return toast.success(matching.guessed.name);
    }

    setGuesses(prev => [...prev, { ...selectedLang, matching }]);
    setSelectedLang(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-6 flex flex-col items-center'>
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
              <p>Select a language to guess!</p>
            </motion.div>

            <Input
              onChange={e => {
                setQuery(e.target.value.toLowerCase().trim());
                setSelectedLang(null);
              }}
              className='relative text-center h-full bg-white z-10'
              placeholder='Type your guess'
              ref={inputRef}
            />

            <QueryRes
              langs={query === '' ? allLangs : data}
              loading={isLoading}
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
            {loading ? <Loading /> : 'Guess'}
            <Send />
          </Button>
        </search>
      </div>
      <p className='text-gray-600'>Attempts left: x</p>
      <GuessesTable guesses={guesses} />
    </div>
  );
}
export default Game;
