'use client';

import type {
  LangFeatures,
  LanguageCode,
  LanguageData,
} from '@/core/lib/types';
import { useState } from 'react';
import FeatureChecker from './feature-checker';
import { Button } from '@/core/components/ui/button';
import objEquals from 'just-compare';
import { langFeatures } from '@/core/lib/utils';
import { setLanguageData } from '@/core/actions/langs';
import { toast } from 'sonner';

type Props = {
  currentData: LanguageData;
  code: LanguageCode;
};

function LangFeaturesForm({ currentData, code }: Props) {
  const currentFeatures = currentData.features;

  const [newFeats, setNewFeats] = useState([...currentFeatures]);

  const createFeatureActivation = (feat: LangFeatures) => (active: boolean) => {
    if (active) {
      setNewFeats([...newFeats, feat]);
    } else {
      setNewFeats(newFeats.filter(f => f !== feat));
    }
  };

  const handleSubmitData = async () => {
    const toastId = toast.loading('Updating features');

    const { success, error, result } = await setLanguageData(code, {
      ...currentData,
      features: newFeats,
    });

    if (!success) {
      return toast.error(error, { id: toastId });
    }

    toast.success(result, { id: toastId });
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
