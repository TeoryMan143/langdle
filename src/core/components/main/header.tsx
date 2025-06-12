'use client';

import { dongle } from '@/core/lib/fonts';
import { Button } from '../ui/button';
import User from '../icons/user';
import Link from 'next/link';
import { useAuth } from '@/modules/auth/context';
import { useRouter } from 'next/navigation';
import LangDataButton from './lang-data-button';

function Header() {
  const { session } = useAuth();
  const router = useRouter();

  return (
    <header className='bg-main relative'>
      <h1
        className={`${dongle.className} text-8xl text-white text-center relative top-2 overflow-clip`}
      >
        <Link href='/'>LANGDLE</Link>
      </h1>
      <div className='absolute top-1/2 -translate-y-1/2 right-7 space-x-3'>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
          onClick={() => {
            if (session) {
              router.push('/account');
            } else {
              router.push('/signup');
            }
          }}
        >
          <User />
        </Button>

        <LangDataButton />
      </div>
    </header>
  );
}
export default Header;
