'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { useLang } from '@/core/hooks/use-lang';
import LangImage from '@/modules/lang-data/components/lang-image';

function FailDialog() {
  const t = useTranslations('Game');

  const { data, error } = useLang({
    action: 'get',
    lang: 'daily',
  });

  if (error) {
    toast.error('No daily lang');
  }

  if (!data) {
    return;
  }

  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle className='text-center'>{t('nextOne')}</DialogTitle>
        <div className='h-full flex flex-col justify-center items-center gap-2'>
          <p>{t('theLangWas', { lang: data.name })}</p>
          <LangImage className='h-32 w-auto' code={data.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FailDialog;
