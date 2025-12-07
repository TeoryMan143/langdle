'use client';

import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { toast } from 'sonner';
import Check from '@/core/components/icons/check';
import Edit from '@/core/components/icons/edit';
import Loading from '@/core/components/icons/loading';
import Xcancel from '@/core/components/icons/x';
import { Button } from '@/core/components/ui/button';
import { useLang } from '@/core/hooks/use-lang';
import { Language } from '@/core/lib/types';
import LangImage from '@/modules/lang-data/components/lang-image';
import LangSelector from '@/modules/lang-data/components/lang-selector';
import { editNativeLanguage } from '../actions';

function NativeLang({ langId }: { langId?: string | null }) {
  return langId ? <NativeLangData langId={langId} /> : <UnknownLang />;
}

function NativeLangData({ langId }: { langId: string }) {
  const {
    data: language,
    isLoading,
    error,
  } = useLang({
    action: 'get',
    lang: langId,
  });

  const [editing, setEditing] = useState(false);

  return editing ? (
    <Editor setEditing={setEditing} />
  ) : (
    <div className='flex gap-1 items-center'>
      <strong>Native language: </strong>
      <LangImage code={langId} />
      <span>
        {isLoading && !language ? (
          <Loading />
        ) : (
          `${language?.name} ${language?.exonym ? `(${language.exonym})` : ''}`
        )}
        {error && 'Unknown error'}
      </span>
      <Button
        className='p-2 bg-white'
        onClick={() => setEditing(true)}
        variant='noShadow'
      >
        <Edit />
      </Button>
    </div>
  );
}

function UnknownLang() {
  const [editing, setEditing] = useState(false);

  return (
    <div className='relative'>
      {editing ? (
        <Editor setEditing={setEditing} />
      ) : (
        <Button onClick={() => setEditing(true)} variant='neutral'>
          + add native language
        </Button>
      )}
    </div>
  );
}

function Editor({
  setEditing,
}: {
  setEditing: Dispatch<SetStateAction<boolean>>;
}) {
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    const toastId = toast.loading('Updating...');

    if (!selectedLang) {
      return toast.error('Select a language', { id: toastId });
    }

    const updatedRes = await editNativeLanguage(selectedLang.id);

    if (!updatedRes.success) {
      return toast.error('Unknown server error', { id: toastId });
    }

    setEditing(false);
    toast.success('New native language set', {
      id: toastId,
    });
  }, [selectedLang, setEditing]);

  return (
    <div className='flex gap-2'>
      <LangSelector onValueChange={l => setSelectedLang(l)} />
      <Button
        onClick={async () => {
          setLoading(true);
          await handleConfirm();
          setLoading(false);
        }}
        disabled={loading}
        variant='noShadow'
      >
        {loading ? <Loading /> : <Check />}
      </Button>
      <Button
        onClick={() => setEditing(false)}
        disabled={loading}
        variant='noShadow'
      >
        {loading ? <Loading /> : <Xcancel />}
      </Button>
    </div>
  );
}

export default NativeLang;
