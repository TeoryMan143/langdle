'use client';

import { Delete } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { toast } from 'sonner';
import Check from '@/core/components/icons/check';
import Loading from '@/core/components/icons/loading';
import Xcancel from '@/core/components/icons/x';
import { Button } from '@/core/components/ui/button';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
import { useRouter } from '@/i18n/navigation';
import LangImage from '@/modules/lang-data/components/lang-image';
import LangSelector from '@/modules/lang-data/components/lang-selector';
import { editFluentLanguages } from '../actions';

function FluentLangs({ fluent }: { fluent?: string | null }) {
  const [currentFluents, setCurrentFluents] = useState(
    fluent ? fluent.split(',') : [],
  );

  return fluent ? (
    <FluentData fluent={currentFluents} setCurrentFluents={setCurrentFluents} />
  ) : (
    <AddFluent
      currentFluents={currentFluents}
      setCurrentFluents={setCurrentFluents}
    />
  );
}

function FluentData({
  fluent,
  setCurrentFluents,
}: {
  fluent: string[];
  setCurrentFluents: Dispatch<SetStateAction<string[]>>;
}) {
  const { data, isLoading, error } = useLang({
    action: 'get',
    langs: fluent,
  });

  const [loading, setLoading] = useState(false);
  const t = useTranslations('AccountPage');

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex flex-col gap-1.5 mb-1'>
        <strong>Fluent languages: </strong>
        {isLoading ? (
          <Loading className='text-6xl' />
        ) : (
          data?.map(language => (
            <div key={language.id} className='flex gap-1 items-center'>
              <LangImage code={language.id} />
              <span>
                {isLoading && !language ? (
                  <Loading />
                ) : (
                  `${language?.name} ${language?.exonym ? `(${language.exonym})` : ''}`
                )}
                {error && t('unknownError')}
              </span>
              <Button
                onClick={async () => {
                  setLoading(true);
                  const newFluents = fluent.filter(l => l !== language.id);
                  await editFluentLanguages(newFluents);
                  setCurrentFluents(newFluents);
                  setLoading(false);
                }}
                className='p-2 bg-white'
                variant='noShadow'
                disabled={loading}
              >
                {loading ? <Loading /> : <Delete />}
              </Button>
            </div>
          ))
        )}
      </div>
      <AddFluent
        currentFluents={fluent}
        setCurrentFluents={setCurrentFluents}
      />
    </div>
  );
}

function Adder({
  setAdding,
  currentFluents,
  setCurrentFluents,
}: {
  setAdding: Dispatch<SetStateAction<boolean>>;
  currentFluents: string[];
  setCurrentFluents: Dispatch<SetStateAction<string[]>>;
}) {
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('AccountPage');
  const router = useRouter();

  const handleConfirm = useCallback(async () => {
    const toastId = toast.loading(`${t('updating')}...`);

    if (!selectedLang) {
      return toast.error(t('selectLang'), { id: toastId });
    }

    const newFluents = [...currentFluents, selectedLang.id];

    const updatedRes = await editFluentLanguages(newFluents);

    setCurrentFluents(newFluents);

    if (!updatedRes.success) {
      return toast.error(t('unknownError'), { id: toastId });
    }

    toast.success(t('newFluent'), {
      id: toastId,
    });
    router.refresh();
  }, [selectedLang, currentFluents, setCurrentFluents, t, router]);

  return (
    <div className='flex gap-2'>
      <LangSelector onValueChange={l => setSelectedLang(l)} />
      <Button
        onClick={async () => {
          setLoading(true);
          await handleConfirm();
          setLoading(false);
          setAdding(false);
        }}
        disabled={loading}
        variant='noShadow'
      >
        {loading ? <Loading /> : <Check />}
      </Button>
      <Button
        onClick={() => setAdding(false)}
        disabled={loading}
        variant='noShadow'
      >
        {loading ? <Loading /> : <Xcancel />}
      </Button>
    </div>
  );
}

function AddFluent({
  currentFluents,
  setCurrentFluents,
}: {
  currentFluents: string[];
  setCurrentFluents: Dispatch<SetStateAction<string[]>>;
}) {
  const [adding, setAdding] = useState(false);
  const t = useTranslations('AccountPage');

  return (
    <>
      {adding && (
        <Adder
          setAdding={setAdding}
          currentFluents={currentFluents}
          setCurrentFluents={setCurrentFluents}
        />
      )}
      <Button onClick={() => setAdding(true)} variant='neutral'>
        + {t('addFluentLang')}
      </Button>
    </>
  );
}

export default FluentLangs;
