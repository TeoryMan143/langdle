'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  createContext,
  Dispatch,
  RefObject,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  type DebouncedState,
  useDebounceValue,
  useLocalStorage,
} from 'usehooks-ts';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
import { getUTCDateString } from '@/core/lib/utils';
import { useAuth } from '@/modules/auth/context';
import { checkGuess } from '../actions';
import { LanguageGuess } from '../types';

type SavedGuesses = {
  date: string;
  guesses: LanguageGuess[];
  dailyLang: Language | null;
};

type UseGameProps = {
  langSearchData: UseQueryResult<Language[]>;
  targetLang: Language;
  guesses: LanguageGuess[];
  query: string;
  setQuery: DebouncedState<(value: string) => void>;
  queryError: string | null;
  handleGuess: () => Promise<string | number | undefined>;
  MAX_ATTEMPTS: number;
  setSelectedLang: Dispatch<SetStateAction<Language | null>>;
  selectedLang: Language | null;
  inputRef: RefObject<HTMLInputElement | null>;
  hasGuessed: boolean;
};

const GameContext = createContext<UseGameProps | null>(null);

const MAX_ATTEMPTS = 5;

export const GameProvider = ({
  children,
  targetLang,
  type,
}: {
  children: React.ReactNode;
  targetLang: Language;
  type: 'daily' | 'random';
}) => {
  const [query, setQuery] = useDebounceValue('', 400);

  const langSearchData = useLang({
    action: 'search',
    query,
  });

  const [localGuesses, setLocalGuesses] = useLocalStorage<SavedGuesses>(
    'day-save',
    { date: 'invalid', guesses: [], dailyLang: null },
  );

  const { session } = useAuth();

  const t = useTranslations('Game');

  const [guesses, setGuesses] = useState<LanguageGuess[]>([]);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);

  const hasRetrievedSave = useRef(false);

  useEffect(() => {
    if (type === 'daily') {
      if (
        !hasRetrievedSave.current &&
        !session &&
        localGuesses.date === getUTCDateString()
      ) {
        hasRetrievedSave.current = true;
        setGuesses(localGuesses.guesses);
        setHasGuessed(true);
      } else if (
        !hasRetrievedSave.current &&
        !session &&
        localGuesses.date !== getUTCDateString()
      ) {
        setLocalGuesses({ date: 'invalid', guesses: [], dailyLang: null });
        hasRetrievedSave.current = true;
      }
    }
  }, [session, localGuesses, setLocalGuesses, type]);

  useEffect(() => {
    if (type === 'daily') {
      if (hasRetrievedSave.current && !session && !localGuesses.dailyLang) {
        setLocalGuesses({
          date: getUTCDateString(),
          guesses,
          dailyLang: null,
        });
      }
    }
  }, [guesses, setLocalGuesses, session, localGuesses.dailyLang, type]);

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

    if (hasGuessed) {
      return toast.info('You already guessed');
    }

    if (!selectedLang) {
      setQueryError(t('selectToGuess'));
      setTimeout(() => setQueryError(null), 4000);
      return;
    }

    const guessFound = guesses.find(g => g.id === selectedLang.id);

    if (guessFound) {
      setQueryError(t('langTried'));
      setTimeout(() => setQueryError(null), 4000);
      return;
    }

    if (selectedLang.id === targetLang.id) {
      setHasGuessed(true);
      return;
    }

    const res = await checkGuess(selectedLang.id, targetLang.id);

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
      setHasGuessed(true);
      return;
    }

    setGuesses(prev => [...prev, { ...selectedLang, matching }]);
    setSelectedLang(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const value = {
    langSearchData,
    targetLang,
    guesses,
    query,
    setQuery,
    queryError,
    handleGuess,
    MAX_ATTEMPTS,
    setSelectedLang,
    selectedLang,
    inputRef,
    hasGuessed,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const gameContext = useContext(GameContext);

  if (gameContext === null) {
    throw new Error('UseGame must be used within a GameProvider');
  }

  return gameContext;
};
