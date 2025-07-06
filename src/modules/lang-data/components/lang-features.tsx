'use client';

import objEquals from 'just-compare';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { setLanguageData } from '@/core/actions/langs';
import { Button } from '@/core/components/ui/button';
import type { LangFeatures, LanguageData } from '@/core/lib/types';
import { langFeatures } from '@/core/lib/utils';
import FeatureChecker from './feature-checker';

type Props = {
  currentData: LanguageData;
  code: string;
};

function LangFeaturesForm({ currentData, code }: Props) {
  const currentFeatures = currentData.features;

  const [newFeats, setNewFeats] = useState([...currentFeatures]);
  const t = useTranslations('LangData');

  const createFeatureActivation = useCallback(
    (feat: LangFeatures) => (active: boolean) => {
      if (active) {
        setNewFeats([...newFeats, feat]);
      } else {
        setNewFeats(newFeats.filter(f => f !== feat));
      }
    },
    [newFeats],
  );

  const handleSubmitData = async () => {
    const toastId = toast.loading(`${t('loading')}...`);

    const { success, error } = await setLanguageData(code, {
      ...currentData,
      features: newFeats,
    });

    if (!success) {
      return toast.error(t(error), { id: toastId });
    }

    toast.success(t('success'), { id: toastId });
  };

  return (
    <div className='mx-4'>
      <div className='flex flex-col lg:min-w-2xl rounded-2xl overflow-clip'>
        {langFeatures.map(feat => {
          return (
            <div className='p-2' key={feat}>
              <FeatureChecker
                onCheckedChange={createFeatureActivation(feat)}
                feat={feat}
                initialActive={newFeats.includes(feat)}
              />
            </div>
          );
        })}
      </div>
      <div className='flex justify-end'>
        <Button
          className='mt-4'
          onClick={handleSubmitData}
          disabled={objEquals(
            [...newFeats].sort(),
            [...currentFeatures].sort(),
          )}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default LangFeaturesForm;
