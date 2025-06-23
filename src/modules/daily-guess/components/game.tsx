'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import Send from '@/core/components/icons/send';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
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
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedLang, setSelectedLang] = useState<Language | null>(null);

  useEffect(() => {
    if (inputRef.current && selectedLang) {
      inputRef.current.value = selectedLang.name;
      inputRef.current.blur();
    }
  }, [selectedLang]);

  return (
    <div className='space-y-6 flex flex-col items-center'>
      <div className='md:h-14 md:w-[95%]'>
        <search className='h-full flex items-center gap-2'>
          <div className='h-full flex-1 relative group/langs'>
            <Input
              onChange={e => {
                setQuery(e.target.value.toLowerCase().trim());
                setSelectedLang(null);
              }}
              className='text-center h-full'
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
          <Button className='p-1 md:px-4 md:py-2 md:h-full'>
            Guess
            <Send />
          </Button>
        </search>
      </div>
      <p className='text-gray-600'>Attempts left: x</p>
      <GuessesTable />
    </div>
  );
}
export default Game;
