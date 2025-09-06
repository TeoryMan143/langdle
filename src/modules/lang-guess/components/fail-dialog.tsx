'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Language } from '@/core/lib/types';
import LangImage from '@/modules/lang-data/components/lang-image';

function FailDialog({ lang }: { lang: Language }) {
  const t = useTranslations('Game');

  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle className='text-center'>{t('nextOne')}</DialogTitle>
        <div className='h-full flex flex-col justify-center items-center gap-2'>
          <p>{t('theLangWas', { lang: lang.name })}</p>
          <LangImage className='h-32 w-auto' code={lang.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FailDialog;
