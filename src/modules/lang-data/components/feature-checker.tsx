'use client';

import FeatureToolTip from '@/core/components/main/feature-tooltip';
import { Checkbox } from '@/core/components/ui/checkbox';
import { Label } from '@/core/components/ui/label';
import { LangFeatures } from '@/core/lib/types';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

type Props = {
  feat: LangFeatures;
  initialActive: boolean;
  onCheckedChange: (active: boolean) => void;
};

function FeatureChecker({
  feat,
  initialActive,
  onCheckedChange: _onCheckedChange,
}: Props) {
  const [active, setActive] = useState(initialActive);
  const t = useTranslations('Features.name');

  const name = useMemo(() => t(feat), [feat, t]);
  const onCheckedChange = useCallback(
    (c: boolean) => _onCheckedChange(c),
    [_onCheckedChange],
  );

  return (
    <FeatureToolTip feature={feat}>
      <Label
        className='flex items-center justify-center gap-3 bg-background hover:bg-main py-4 cursor-pointer rounded-lg'
        htmlFor={feat}
      >
        <Checkbox
          onCheckedChange={c => {
            if (c !== 'indeterminate') {
              setActive(c);
              onCheckedChange(c);
            }
          }}
          checked={active}
          id={feat}
        />{' '}
        {name}
      </Label>
    </FeatureToolTip>
  );
}

export default React.memo(FeatureChecker);
