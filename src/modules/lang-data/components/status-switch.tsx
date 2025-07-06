'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import Loading from '@/core/components/icons/loading';
import { Label } from '@/core/components/ui/label';
import { Switch } from '@/core/components/ui/switch';
import { setLangStatus } from '../actions';

function StatusSwitch({ defStatus }: { defStatus: boolean }) {
  const id = useId();
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(defStatus);

  const t = useTranslations('LangData');

  const handleChecked = async (val: boolean) => {
    const res = await setLangStatus(code, val);

    if (!res.success) {
      return toast.error(t(res.error));
    }

    setStatus(val);
  };

  return (
    <div className='flex justify-center items-center gap-3 relative'>
      <Label htmlFor={id}>Status: </Label>
      <Switch
        onCheckedChange={async val => {
          setLoading(true);
          await handleChecked(val);
          setLoading(false);
        }}
        checked={status}
        id={id}
      />
      {loading && <Loading className='absolute left-2 text-main' />}
    </div>
  );
}

export default StatusSwitch;
