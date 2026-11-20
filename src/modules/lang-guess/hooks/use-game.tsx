'use client';

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
import { useLocalStorage } from 'usehooks-ts';
import { getUTCDateString } from '@/core/lib/utils';
import { Language } from '@/core/types';
import { useLangSearch } from '@/modules/lang-data/hooks/use-lang-search';
import type { LangSearchResult, LanguageName } from '@/modules/lang-data/types';
import { addGameHistory, checkGuess } from '../actions';
import { LanguageGuess } from '../types';

type SavedGuesses = {
  date: string;
  guesses: LanguageGuess[];
  dailyLang: Language | null;
};

type UseGameProps = {
  langSearchData: LangSearchResult;
  targetLang: Language;
  guesses: LanguageGuess[];
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  queryError: string | null;
  handleGuess: () => Promise<string | number | undefined>;
  MAX_ATTEMPTS: number;
  setSelectedLang: Dispatch<SetStateAction<LanguageName | null>>;
  selectedLang: LanguageName | null;
  inputRef: RefObject<HTMLInputElement | null>;
  hasGuessed: boolean;
  type: 'daily' | 'random';
};

const GameContext = createContext<UseGameProps | null>(null);

const MAX_ATTEMPTS = 5;

export const GameProvider = ({
  children,
  targetLang: initialTargetLang,
  type,
}: {
  children: React.ReactNode;
  targetLang: Language;
  type: 'daily' | 'random';
}) => {
  // A game keeps the language it started with. The page re-renders whenever a
  // server action revalidates or touches cookies, and /random draws a new
  // language on every render: following the prop would swap the target under
  // a game in progress (a win dialog showing another language).
  const [targetLang] = useState(initialTargetLang);
  // Ranked in the browser on a list read once: no debounce, no round trip.
  const [query, setQuery] = useState('');
  const langSearchData = useLangSearch({ query });

  const [localGuesses, setLocalGuesses] = useLocalStorage<SavedGuesses>(
    'day-save',
    { date: 'invalid', guesses: [], dailyLang: null },
  );

  const t = useTranslations('Game');

  const [guesses, setGuesses] = useState<LanguageGuess[]>([]);
  const [selectedLang, setSelectedLang] = useState<LanguageName | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);

  const hasRetrievedSave = useRef(false);

  useEffect(() => {
    if (type === 'daily') {
      if (
        !hasRetrievedSave.current &&
        localGuesses.date === getUTCDateString()
      ) {
        hasRetrievedSave.current = true;
        setGuesses(localGuesses.guesses);
        setHasGuessed(localGuesses.dailyLang !== null);
      } else if (
        !hasRetrievedSave.current &&
        localGuesses.date !== getUTCDateString()
      ) {
        setLocalGuesses({ date: 'invalid', guesses: [], dailyLang: null });
        hasRetrievedSave.current = true;
      }
    }
  }, [localGuesses, setLocalGuesses, type]);

  useEffect(() => {
    if (type === 'daily') {
      if (hasRetrievedSave.current && !localGuesses.dailyLang) {
        setLocalGuesses({
          date: getUTCDateString(),
          guesses,
          dailyLang: null,
        });
      }
    }
  }, [guesses, setLocalGuesses, localGuesses.dailyLang, type]);

  useEffect(() => {
    if (inputRef.current && selectedLang) {
      inputRef.current.value = selectedLang.name;
    }
  }, [selectedLang]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleGuess = async () => {
    if (guesses.length >= MAX_ATTEMPTS) {
      return toast.error(t('noAttemptsLeft'));
    }

    if (hasGuessed) {
      return toast.info(t('alreadyGuessed'));
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
      setLocalGuesses({
        date: getUTCDateString(),
        guesses,
        dailyLang: targetLang,
      });
      setHasGuessed(true);
      await addGameHistory({
        guessed: true,
        guesses: guesses.length + 1,
        targetLang: targetLang.id,
        type,
      });
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

    if (guesses.length === MAX_ATTEMPTS - 1) {
      await addGameHistory({
        guessed: false,
        guesses: guesses.length + 1,
        targetLang: targetLang.id,
        type,
      });
    }

    const { id, name, exonym } = selectedLang;
    setGuesses(prev => [...prev, { id, name, exonym, matching }]);
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
    type,
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
