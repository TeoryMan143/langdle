'use client';

import { useTranslations } from 'next-intl';
import { groupedLangFeatures, langFeatures } from '@/core/lib/features';
import type { LangFeatures } from '@/core/types';
import FeatureChecker from './feature-checker';

export type FeatureState = 'notPresent' | 'partial' | 'present';
export type FeatureStates = Record<LangFeatures, FeatureState>;

/** Every feature with its state, read from a language's two lists. */
export function toFeatureStates(data: {
  features: readonly string[];
  partial: readonly string[];
}): FeatureStates {
  return Object.fromEntries(
    langFeatures.map(feature => [
      feature,
      data.features.includes(feature)
        ? 'present'
        : data.partial.includes(feature)
          ? 'partial'
          : 'notPresent',
    ]),
  ) as FeatureStates;
}

/** The two sorted lists a language stores, from every feature's state. */
export function fromFeatureStates(states: FeatureStates) {
  const pick = (state: FeatureState) =>
    (Object.entries(states) as [LangFeatures, FeatureState][])
      .filter(([, value]) => value === state)
      .map(([feature]) => feature)
      .sort();

  return { features: pick('present'), partial: pick('partial') };
}

function FeatureGroup({
  group,
  children,
}: {
  group: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('LangData');

  return (
    <section className='flex flex-col h-[30rem] w-full max-w-[32rem] bg-background border-2 border-border rounded-base shadow-shadow overflow-hidden'>
      <h3 className='text-center text-2xl font-heading py-3 bg-secondary-background border-b-2 border-border'>
        {t(group)}
      </h3>
      <div className='flex-1 min-h-0 overflow-y-auto p-4'>{children}</div>
    </section>
  );
}

type Props = {
  value: FeatureStates;
  onChange: (feature: LangFeatures, state: FeatureState) => void;
};

/** Present / partial / absent for every feature, grouped like the game. */
function FeatureStatusPicker({ value, onChange }: Props) {
  return (
    <div className='flex justify-center gap-9 flex-wrap'>
      {Object.entries(groupedLangFeatures).map(([group, features]) => (
        <FeatureGroup key={group} group={group}>
          <ul className='space-y-2 mb-2'>
            {features.map(feature => (
              <li key={feature}>
                <FeatureChecker
                  feat={feature}
                  state={value[feature]}
                  onChange={state => onChange(feature, state)}
                />
              </li>
            ))}
          </ul>
        </FeatureGroup>
      ))}
    </div>
  );
}

export default FeatureStatusPicker;
