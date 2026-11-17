'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import type { LanguageData } from '@/core/types';
import { setLanguageData } from '@/modules/lang-data/actions';
import FeatureStatusPicker, {
  type FeatureStates,
  fromFeatureStates,
  toFeatureStates,
} from './feature-status-picker';

type Props = {
  currentData: LanguageData;
  code: string;
};

function LangFeaturesForm({ currentData, code }: Props) {
  const t = useTranslations('LangData');

  const [states, setStates] = useState<FeatureStates>(() =>
    toFeatureStates(currentData),
  );

  const handleSubmitData = async () => {
    const toastId = toast.loading(`${t('loading')}...`);

    const { success, error } = await setLanguageData(code, {
      ...currentData,
      ...fromFeatureStates(states),
    });

    if (!success) {
      return toast.error(t(error), { id: toastId });
    }

    toast.success(t('success'), { id: toastId });
  };

  return (
    <div className='relative'>
      <FeatureStatusPicker
        value={states}
        onChange={(feature, state) =>
          setStates(current => ({ ...current, [feature]: state }))
        }
      />
      <Button
        className='mt-4 fixed bottom-3 right-3'
        onClick={handleSubmitData}
      >
        Save
      </Button>
    </div>
  );
}

export default LangFeaturesForm;
