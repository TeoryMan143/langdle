'use client';

import clsx, { ClassValue } from 'clsx';
import { useEffect, useState } from 'react';
import { flagKey } from '@/core/lib/flags-config';

/**
 * Where a flag may be, in order: the ones shipped in `public/flags`, the ones
 * published to the bucket (languages added through requests), the unknown one.
 */
function flagSources(code: string) {
  const bucket = process.env.NEXT_PUBLIC_FLAGS_URL;

  return [
    `/flags/${code}.webp`,
    ...(bucket ? [`${bucket}/${flagKey(code)}`] : []),
    '/flags/unknown.webp',
  ];
}

function LangImage({
  code,
  className,
}: {
  code: string;
  className?: ClassValue;
}) {
  const sources = flagSources(code);
  const [step, setStep] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: start over for a new code
  useEffect(() => {
    setStep(0);
  }, [code]);

  return (
    <img
      src={sources[Math.min(step, sources.length - 1)]}
      width={455}
      height={304}
      alt={`${code} flag`}
      onError={() =>
        setStep(current => Math.min(current + 1, sources.length - 1))
      }
      className={clsx(className, 'w-6 h-5 rounded-xs inline-block')}
    />
  );
}

export default LangImage;
