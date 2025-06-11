'use client';

import { toast } from 'sonner';
import { getLangPermissionUrl } from '../actions';
import { Button } from '@/core/components/ui/button';

function SharePermissionButton({ lang }: { lang: string }) {
  const handleClick = async () => {
    const toastId = toast.loading('Generating URL...');

    const res = await getLangPermissionUrl(lang);

    if (!res.success) {
      toast.error(res.error, { id: toastId });
      return;
    }

    toast.success('URL copied to clipboard', { id: toastId });
    await navigator.clipboard.writeText(res.result);
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
