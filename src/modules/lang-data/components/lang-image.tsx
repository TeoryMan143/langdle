'use client';

import clsx, { ClassValue } from 'clsx';
import Image from 'next/image';
import { useEffect, useState } from 'react';

function LangImage({
  code,
  className,
}: {
  code: string;
  className?: ClassValue;
}) {
  const [imageUrl, setImageUrl] = useState(`/flags/${code}.webp`);

  useEffect(() => {
    setImageUrl(`/flags/${code}.webp`);
  }, [code]);

  return (
    <img
      src={imageUrl}
      width={455}
      height={304}
      alt={`${code} flag`}
      onError={() => setImageUrl('/flags/unknown.webp')}
      className={clsx(className, 'w-6 h-5 rounded-xs inline-block')}
    />
  );
}

export default LangImage;
