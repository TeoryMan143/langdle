'use client';

import { dongle } from '@/core/lib/fonts';
import { Button } from '../ui/button';
import SolidBars from '../icons/solid-bars';
import User from '../icons/user';

function Header() {
  return (
    <header className='bg-main relative'>
      <h1
        className={`${dongle.className} text-8xl text-white text-center relative top-2`}
      >
        LANGDLE
      </h1>
      <div className='absolute top-1/2 -translate-y-1/2 right-7 space-x-3'>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
        >
          <User />
        </Button>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
        >
          <SolidBars className='text-xl' />
        </Button>
      </div>
    </header>
  );
}
export default Header;
