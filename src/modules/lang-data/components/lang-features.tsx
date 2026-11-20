'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import type { LanguageData } from '@/core/types';
import { setLanguageData } from '@/modules/lang-data/actions';
import type { FeatureStates, PlaceDraft } from '../types';
import FeatureStatusPicker, {
  fromFeatureStates,
  toFeatureStates,
} from './feature-status-picker';
import LangPlaceFields, {
  fromPlaceDraft,
  toPlaceDraft,
} from './lang-place-fields';

type Props = {
  currentData: LanguageData;
  code: string;
};

function LangFeaturesForm({ currentData, code }: Props) {
  const t = useTranslations('LangData');

  const [states, setStates] = useState<FeatureStates>(() =>
    toFeatureStates(currentData),
  );
  const [place, setPlace] = useState<PlaceDraft>(() =>
    toPlaceDraft(currentData),
  );

  const handleSubmitData = async () => {
    const managed = fromPlaceDraft(place);

    if (!managed) {
      return toast.error(t('invalidLocation'));
    }

    const toastId = toast.loading(`${t('loading')}...`);

    const { success, error } = await setLanguageData(code, {
      ...currentData,
      ...fromFeatureStates(states),
      ...managed,
    });

    if (!success) {
      return toast.error(t(error), { id: toastId });
    }

    toast.success(t('success'), { id: toastId });
  };

  return (
    <div className='relative space-y-9'>
      <LangPlaceFields value={place} onChange={setPlace} />
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
