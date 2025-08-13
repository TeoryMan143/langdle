'use client';

import { Label } from '@radix-ui/react-label';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo } from 'react';
import FeatureToolTip from '@/core/components/main/feature-tooltip';
import { LangFeatures } from '@/core/lib/types';
import { cn } from '@/core/lib/utils';

type Props = {
  feat: LangFeatures;
  state: 'notPresent' | 'partial' | 'present';
  onChange: (state: 'notPresent' | 'partial' | 'present') => void;
};

function CheckButton({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'bg-white cursor-pointer size-6 rounded-lg border-2 border-black transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function FeatureChecker({ feat, state, onChange: _onChange }: Props) {
  const t = useTranslations('Features.name');
  const name = useMemo(() => t(feat), [feat, t]);

  const onChange = useCallback(_onChange, []);

  return (
    <FeatureToolTip feature={feat}>
      <div className='flex gap-3 bg-main py-3 rounded-lg justify-between items-center'>
        <p className='px-1 max-w-36 ml-2'>{name}</p>
        <div className='grid grid-cols-3 gap-0.5 [&_label]:text-center'>
          <div className='flex flex-col items-center gap-1'>
            <CheckButton
              className={cn({
                'bg-red-600': state === 'notPresent',
              })}
              onClick={() => onChange('notPresent')}
              id={`notPresentBtn-${feat}`}
            />
            <Label htmlFor='notPresentBtn'>Not present</Label>
          </div>
          <div className='flex flex-col items-center gap-1'>
            <CheckButton
              className={cn({
                'bg-amber-400': state === 'partial',
              })}
              onClick={() => onChange('partial')}
              id={`partialBtn-${feat}`}
            />
            <Label htmlFor='partialBtn'>Partial</Label>
          </div>
          <div className='flex flex-col items-center gap-1'>
            <CheckButton
              className={cn({
                'bg-green-500': state === 'present',
              })}
              onClick={() => onChange('present')}
              id={`presentBtn-${feat}`}
            />
            <Label htmlFor='presentBtn'>Present</Label>
          </div>
        </div>
      </div>
    </FeatureToolTip>
  );
}

export default React.memo(FeatureChecker);
