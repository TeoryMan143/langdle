'use client';

import type { LangFeatures, LanguageData } from '@/core/lib/types';
import { useCallback, useState } from 'react';
import FeatureChecker from './feature-checker';
import { Button } from '@/core/components/ui/button';
import objEquals from 'just-compare';
import { langFeatures } from '@/core/lib/utils';
import { setLanguageData } from '@/core/actions/langs';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type Props = {
  currentData: LanguageData;
  code: string;
};

function LangFeaturesForm({ currentData, code }: Props) {
  const currentFeatures = currentData.features;

  const [newFeats, setNewFeats] = useState([...currentFeatures]);
  const t = useTranslations('Errors.langData');

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
    <div>
      <div className='flex flex-col min-w-2xl rounded-2xl overflow-clip'>
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
