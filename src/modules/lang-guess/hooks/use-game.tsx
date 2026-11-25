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
import { getUTCDateString, randomId } from '@/core/lib/utils';
import { Language } from '@/core/types';
import { useGameLog } from '@/modules/game-logs/hooks/use-game-log';
import { useLangSearch } from '@/modules/lang-data/hooks/use-lang-search';
import type { LangSearchResult, LanguageName } from '@/modules/lang-data/types';
import { addGameHistory, checkGuess } from '../actions';
import { LanguageGuess } from '../types';

/**
 * Progress of today's daily game. `targetId` ties it to the language it was
 * played against: the cron that rolls the daily language does not fire at
 * 00:00 UTC sharp, so a save dated today can belong to yesterday's language.
 * `gameId` keeps a resumed game's logs together (saves from before it have
 * none and get a new one).
 */
type SavedGuesses = {
  date: string;
  targetId: string | null;
  gameId?: string;
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

const EMPTY_SAVE: SavedGuesses = {
  date: 'invalid',
  targetId: null,
  guesses: [],
  dailyLang: null,
};

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
    EMPTY_SAVE,
  );

  const t = useTranslations('Game');

  const [guesses, setGuesses] = useState<LanguageGuess[]>([]);
  const [selectedLang, setSelectedLang] = useState<LanguageName | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);

  const hasRetrievedSave = useRef(false);
  const gameId = useRef('');
  const logEvent = useGameLog(type, targetLang.id);

  useEffect(() => {
    if (hasRetrievedSave.current) {
      return;
    }

    hasRetrievedSave.current = true;

    if (type !== 'daily') {
      gameId.current = randomId();
      logEvent('start', { gameId: gameId.current, attempt: 0 });
      return;
    }

    const resumes =
      localGuesses.date === getUTCDateString() &&
      localGuesses.targetId === targetLang.id;

    gameId.current = (resumes && localGuesses.gameId) || randomId();

    if (resumes) {
      setGuesses(localGuesses.guesses);
      setHasGuessed(localGuesses.dailyLang !== null);
    } else {
      setLocalGuesses(EMPTY_SAVE);
    }

    const attempts = resumes ? localGuesses.guesses.length : 0;
    const finished =
      resumes && (localGuesses.dailyLang !== null || attempts >= MAX_ATTEMPTS);

    // Coming back to a finished daily game is not playing it.
    if (!finished) {
      logEvent('start', {
        gameId: gameId.current,
        attempt: attempts,
        resumed: attempts > 0,
      });
    }
  }, [localGuesses, logEvent, setLocalGuesses, targetLang.id, type]);

  useEffect(() => {
    if (type === 'daily') {
      if (hasRetrievedSave.current && !localGuesses.dailyLang) {
        setLocalGuesses({
          date: getUTCDateString(),
          targetId: targetLang.id,
          gameId: gameId.current,
          guesses,
          dailyLang: null,
        });
      }
    }
  }, [guesses, setLocalGuesses, localGuesses.dailyLang, targetLang.id, type]);

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

    const attempt = guesses.length + 1;
    const logDetails = { gameId: gameId.current, attempt };

    if (selectedLang.id === targetLang.id) {
      setLocalGuesses({
        date: getUTCDateString(),
        targetId: targetLang.id,
        gameId: gameId.current,
        guesses,
        dailyLang: targetLang,
      });
      setHasGuessed(true);
      logEvent('guess', { ...logDetails, guessLang: selectedLang.id });
      logEvent('win', logDetails);
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

    logEvent('guess', { ...logDetails, guessLang: selectedLang.id });

    if ('guessed' in matching) {
      setLocalGuesses({
        date: getUTCDateString(),
        targetId: targetLang.id,
        gameId: gameId.current,
        guesses,
        dailyLang: matching.guessed,
      });
      setHasGuessed(true);
      logEvent('win', logDetails);
      return;
    }

    if (guesses.length === MAX_ATTEMPTS - 1) {
      logEvent('lose', logDetails);
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
