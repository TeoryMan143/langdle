'use client';

import clsx, { ClassValue } from 'clsx';
import { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLImageElement>(null);
  const src = sources[Math.min(step, sources.length - 1)];

  /** Moves past `failed`, once, however many times its failure is noticed. */
  const fallBack = (failed: number) =>
    setStep(current =>
      current === failed ? Math.min(current + 1, sources.length - 1) : current,
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: start over for a new code
  useEffect(() => {
    setStep(0);
  }, [code]);

  // The image is server-rendered, so it can fail before hydration, and React
  // never replays that error to `onError`: check for it once we are mounted.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check per source
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) fallBack(step);
  }, [src]);

  return (
    <img
      ref={ref}
      src={src}
      width={455}
      height={304}
      alt={`${code} flag`}
      // Lists show thousands of languages, most without a flag of their own:
      // only the visible rows should walk the fallback chain.
      loading='lazy'
      decoding='async'
      onError={() => fallBack(step)}
      className={clsx(className, 'w-6 h-5 rounded-xs inline-block')}
    />
  );
}

export default LangImage;
