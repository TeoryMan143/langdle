'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { setLanguageData } from '@/core/actions/langs';
import { Button } from '@/core/components/ui/button';
import type { LangFeatures, LanguageData } from '@/core/lib/types';
import { groupedLangFeatures, langFeatures } from '@/core/lib/utils';
import FeatureChecker from './feature-checker';

type Props = {
  currentData: LanguageData;
  code: string;
};

type FeatureState = 'notPresent' | 'partial' | 'present';
type LocalFeature = Record<LangFeatures, FeatureState>;

function FeatureGroup({
  group,
  children,
}: {
  group: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('LangData');

  return (
    <div className='p-5 rounded-lg bg-background h-[30rem] overflow-y-hidden w-[32rem] pb-2'>
      <h3 className='text-center text-2xl font-bold'>{t(group)}</h3>
      <div className='p-2 h-full overflow-y-auto'>{children}</div>
    </div>
  );
}

const getFeartureState = (
  feature: string,
  featuresData: {
    features: string[];
    partial: string[];
  },
): FeatureState => {
  if (featuresData.features.includes(feature)) {
    return 'present';
  }
  if (featuresData.partial.includes(feature)) {
    return 'partial';
  }
  return 'notPresent';
};

function LangFeaturesForm({ currentData, code }: Props) {
  const t = useTranslations('LangData');

  const groupLocal = (feature: LangFeatures) => [
    feature,
    getFeartureState(feature, currentData),
  ];

  const [newFeaturesData, setNewFeaturesData] = useState<LocalFeature>(
    Object.fromEntries(langFeatures.map(groupLocal)),
  );

  const convertData = (): LanguageData => ({
    ...currentData,
    features: Object.entries(newFeaturesData)
      .filter(([_, state]) => state === 'present')
      .map(([feat]) => feat as LangFeatures)
      .sort(),
    partial: Object.entries(newFeaturesData)
      .filter(([_, state]) => state === 'partial')
      .map(([feat]) => feat as LangFeatures)
      .sort(),
  });

  const handleSubmitData = async () => {
    const toastId = toast.loading(`${t('loading')}...`);

    const { success, error } = await setLanguageData(code, convertData());

    if (!success) {
      return toast.error(t(error), { id: toastId });
    }

    toast.success(t('success'), { id: toastId });
  };

  return (
    <div className='flex justify-center gap-9 flex-wrap relative'>
      {Object.entries(groupedLangFeatures).map(([group, features]) => (
        <FeatureGroup key={group} group={group}>
          <ul className='space-y-2 mb-2'>
            {features.map(f => (
              <li key={f}>
                <FeatureChecker
                  onChange={newState => {
                    setNewFeaturesData(current => {
                      const newData = { ...current };
                      newData[f] = newState;
                      return newData;
                    });
                  }}
                  state={newFeaturesData[f]}
                  feat={f}
                />
              </li>
            ))}
          </ul>
        </FeatureGroup>
      ))}
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
