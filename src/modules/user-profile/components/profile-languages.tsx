'use client';

import { Pencil, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Skeleton } from '@/core/components/ui/skeleton';
import LangImage from '@/modules/lang-data/components/lang-image';
import LangPickerDialog from '@/modules/lang-data/components/lang-picker-dialog';
import { useLangLabel } from '@/modules/lang-data/hooks/use-lang-label';
import { useLangSearch } from '@/modules/lang-data/hooks/use-lang-search';
import type { LanguageName } from '@/modules/lang-data/types';
import { editFluentLanguages, editNativeLanguage } from '../actions';

type Props = {
  nativeId?: string | null;
  /** The fluent languages, as the user stores them (`es,en`). */
  fluent?: string | null;
};

type Picking = 'native' | 'fluent' | null;

/**
 * The native and fluent languages of the account, editable: a row per
 * language with one action, and a picker over every language (active or not)
 * that saves what is picked. The mobile app's `ProfileLanguages`.
 */
function ProfileLanguages({ nativeId: initialNative, fluent }: Props) {
  const t = useTranslations('AccountPage');
  const [nativeId, setNativeId] = useState(initialNative ?? null);
  const [fluentIds, setFluentIds] = useState(
    fluent ? fluent.split(',').filter(Boolean) : [],
  );
  const [picking, setPicking] = useState<Picking>(null);
  const [saving, setSaving] = useState(false);

  // The same list the picker searches, read once: the rows' names.
  const { data: names } = useLangSearch({ query: '', active: 'all' });
  const byId = useMemo(
    () => new Map(names?.map(lang => [lang.id, lang])),
    [names],
  );

  /** Saves with the toast flow of the forms; answers whether it worked. */
  const save = async (
    request: () => Promise<{ success: boolean }>,
    successKey: 'newNative' | 'newFluent' | 'fluentRemoved',
  ) => {
    setSaving(true);
    const id = toast.loading(`${t('updating')}...`);
    const res = await request();
    setSaving(false);

    if (!res.success) {
      toast.error(t('unknownError'), { id });
      return false;
    }

    toast.success(t(successKey), { id });
    return true;
  };

  const pickNative = async (lang: LanguageName) => {
    if (await save(() => editNativeLanguage(lang.id), 'newNative')) {
      setNativeId(lang.id);
    }
  };

  const addFluent = async (lang: LanguageName) => {
    const next = [...fluentIds, lang.id];

    if (await save(() => editFluentLanguages(next), 'newFluent')) {
      setFluentIds(next);
    }
  };

  const removeFluent = async (id: string) => {
    const next = fluentIds.filter(fluentId => fluentId !== id);

    if (await save(() => editFluentLanguages(next), 'fluentRemoved')) {
      setFluentIds(next);
    }
  };

  return (
    <div className='space-y-5'>
      <section className='space-y-2'>
        <h5 className='text-sm font-heading text-soft-det'>
          {t('nativeLang')}
        </h5>
        {nativeId ? (
          <LanguageRow
            id={nativeId}
            language={byId.get(nativeId)}
            loading={!names}
            action={
              <Button
                variant='neutral'
                size='icon-sm'
                aria-label={t('edit')}
                title={t('edit')}
                disabled={saving}
                onClick={() => setPicking('native')}
              >
                <Pencil />
              </Button>
            }
          />
        ) : (
          <AddButton
            label={t('addNativeLang')}
            disabled={saving}
            onClick={() => setPicking('native')}
          />
        )}
      </section>

      <section className='space-y-2'>
        <h5 className='text-sm font-heading text-soft-det'>
          {t('fluentLang')}
        </h5>
        {fluentIds.length > 0 && (
          <ul className='space-y-2'>
            {fluentIds.map(id => (
              <li key={id}>
                <LanguageRow
                  id={id}
                  language={byId.get(id)}
                  loading={!names}
                  action={
                    <Button
                      variant='neutral'
                      size='icon-sm'
                      aria-label={t('remove')}
                      title={t('remove')}
                      disabled={saving}
                      onClick={() => removeFluent(id)}
                    >
                      <X />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <AddButton
          label={t('addFluentLang')}
          disabled={saving}
          onClick={() => setPicking('fluent')}
        />
      </section>

      <LangPickerDialog
        open={picking !== null}
        onOpenChange={open => !open && setPicking(null)}
        title={t(picking === 'fluent' ? 'fluentLang' : 'nativeLang')}
        excluded={picking === 'fluent' ? fluentIds : nativeId ? [nativeId] : []}
        onPick={picking === 'fluent' ? addFluent : pickNative}
      />
    </div>
  );
}

function LanguageRow({
  id,
  language,
  loading,
  action,
}: {
  id: string;
  /** Missing when the language left the catalogue: the code is shown. */
  language?: LanguageName;
  loading: boolean;
  action: React.ReactNode;
}) {
  const label = useLangLabel();

  return (
    <div className='flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background py-1.5 pr-1.5 pl-3'>
      <LangImage code={id} />
      {!language && loading ? (
        <span className='min-w-0 flex-1'>
          <Skeleton className='h-4 w-32 bg-background' />
        </span>
      ) : (
        <span className='min-w-0 flex-1 font-heading'>
          {language ? label(language) : id}
        </span>
      )}
      {action}
    </div>
  );
}

function AddButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant='neutral'
      className='w-full'
      disabled={disabled}
      onClick={onClick}
    >
      <Plus />
      {/* The messages are lowercase ("add fluent language"). */}
      <span className='inline-block first-letter:uppercase'>{label}</span>
    </Button>
  );
}

export default ProfileLanguages;
