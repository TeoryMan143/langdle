'use client';

import type { LangFeatures } from '@/core/lib/types';
import { useState } from 'react';
import FeatureChecker from './feature-checker';
import { Button } from '@/core/components/ui/button';
import objEquals from 'just-compare';
import { langFeatures } from '@/core/lib/utils';

type Props = {
  currentFeatures: LangFeatures[];
};

function LangFeaturesForm({ currentFeatures }: Props) {
  const [newFeats, setNewFeats] = useState({ ...currentFeatures });

  const createFeatureActivation = (feat: LangFeatures) => (active: boolean) => {
    if (active) {
      setNewFeats([...newFeats, feat]);
    } else {
      setNewFeats(newFeats.filter(f => f !== feat));
    }
  };

  return (
    <div>
      <div className='flex flex-col min-w-2xl rounded-2xl overflow-clip'>
        {langFeatures.map(feat => {
          const active = newFeats.includes(feat);

          return (
            <FeatureChecker
              onCheckedChange={createFeatureActivation(feat)}
              key={feat}
              feat={feat}
              initialActive={active}
            />
          );
        })}
      </div>
      <div className='flex justify-end'>
        <Button
          className='marker:t-4'
          disabled={
            !objEquals([...currentFeatures].sort(), [...langFeatures].sort())
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default LangFeaturesForm;
