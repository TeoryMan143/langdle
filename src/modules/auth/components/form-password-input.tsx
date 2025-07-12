'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Input } from '@/core/components/ui/input';
import { cn } from '@/core/lib/utils';

function FormPasswordInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  const [inputMode, setInputMode] = useState<string>('password');

  return (
    <div className='relative group'>
      <Input
        type={inputMode}
        className={cn('focus-visible:ring-main realtive z-10', className)}
        {...props}
      />
      <button
        type='button'
        className='absolute right-2 top-1/2 -translate-y-1/2 z-20 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer'
        onClick={() =>
          inputMode === 'password'
            ? setInputMode('text')
            : setInputMode('password')
        }
      >
        <motion.svg
          xmlns='http://www.w3.org/2000/svg'
          width='1em'
          height='1em'
          viewBox='0 0 24 24'
        >
          <motion.g
            initial={{
              strokeWidth: 0,
              stroke: 'var(--ring)',
            }}
            animate={
              inputMode === 'password'
                ? {
                    stroke: 'var(--ring)',
                    strokeWidth: 2,
                  }
                : {
                    stroke: 'var(--main)',
                    strokeWidth: 2,
                  }
            }
            fill='none'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <motion.path
              initial={{
                d: 'M2 10s3.5 4 10 4s10-4 10-4M4 11.645L2 14m20 0l-1.996-2.352M8.914 13.68L8 16.5m7.063-2.812L16 16.5',
              }}
              animate={
                inputMode === 'password'
                  ? {
                      d: 'M2 10s3.5 4 10 4s10-4 10-4M4 11.645L2 14m20 0l-1.996-2.352M8.914 13.68L8 16.5m7.063-2.812L16 16.5',
                    }
                  : {
                      d: 'M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962',
                    }
              }
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={
                inputMode === 'password'
                  ? {
                      scale: 0,
                    }
                  : {
                      scale: 1,
                    }
              }
              cx='12'
              cy='12'
              r='3'
            />
          </motion.g>
        </motion.svg>
      </button>
    </div>
  );
}

// closed
<svg
  xmlns='http://www.w3.org/2000/svg'
  width='1em'
  height='1em'
  viewBox='0 0 24 24'
>
  <path
    fill='none'
    stroke='currentColor'
    strokeLinecap='round'
    strokeLinejoin='round'
    strokeWidth='2'
    d='M2 10s3.5 4 10 4s10-4 10-4M4 11.645L2 14m20 0l-1.996-2.352M8.914 13.68L8 16.5m7.063-2.812L16 16.5'
  />
</svg>;

// open
<svg
  xmlns='http://www.w3.org/2000/svg'
  width='1em'
  height='1em'
  viewBox='0 0 24 24'
>
  <g
    fill='none'
    stroke='currentColor'
    strokeLinecap='round'
    strokeLinejoin='round'
    strokeWidth='2'
  >
    <path d='M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962' />
    <circle cx='12' cy='12' r='3' />
  </g>
</svg>;

export default FormPasswordInput;
