'use client';

import { toast } from 'sonner';
import { getLangPermissionUrl } from '../actions';
import { Button } from '@/core/components/ui/button';
import { useTranslations } from 'next-intl';

function SharePermissionButton({ lang }: { lang: string }) {
  const t = useTranslations('Error.langPermissions');

  const handleClick = async () => {
    const toastId = toast.loading(t('loading'));

    const res = await getLangPermissionUrl(lang);

    if (!res.success) {
      toast.error(t(res.error), { id: toastId });
      return;
    }

    await navigator.clipboard.writeText(res.result);
    toast.success(t('genSuccess'), { id: toastId });
  };

  return (
    <Button size='icon' onClick={handleClick}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='1em'
        height='1em'
        viewBox='0 0 24 24'
      >
        <path
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          d='M12 5v8.5M15 7l-3-3l-3 3m-4 5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5'
        />
      </svg>
    </Button>
  );
}

export default SharePermissionButton;
