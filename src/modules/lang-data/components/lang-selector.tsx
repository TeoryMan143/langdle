'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useState } from 'react';

function LangSelector({
  code,
  name,
  exonym,
}: { code: string; name: string; exonym?: string }) {
  const [imageUrl, setImageUrl] = useState(`/flags/${code}.webp`);

  return (
    <Link
      href={`/data/${code}`}
      className='flex gap-2 justify-center items-center py-3 border-b border-black transition-colors px-4 hover:bg-main'
    >
      <Image
        src={imageUrl}
        width={455}
        height={304}
        alt={`${code} flag`}
        onError={() => setImageUrl('/flags/unknown.webp')}
        className='w-6 h-5 rounded-xs'
      />{' '}
      <p className='text-center text-xl'>{`${name}${exonym ? ` (${exonym})` : ''}`}</p>
    </Link>
  );
}

export default LangSelector;
