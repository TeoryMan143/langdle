'use client';

import { dongle } from '@/core/lib/fonts';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/modules/auth/context';
import Admin from '../icons/admin';
import User from '../icons/user';
import { Button } from '../ui/button';
import LangDataAllowed from './lang-data-allowed';
import OptionsSidebar from './options-sidebar';

function Header() {
  const { session } = useAuth();

  return (
    <header className='bg-main relative'>
      <h1
        className={`${dongle.className} text-left ml-3 text-6xl lg:text-8xl lg:ml-0 text-white md:text-center relative top-1 md:top-2 overflow-clip`}
      >
        <Link href='/'>LANGDLE</Link>
      </h1>
      <div className='absolute top-1/2 -translate-y-1/2 right-3 md:right-7 md:space-x-3'>
        <div className='flex md:hidden'>
          <OptionsSidebar />
        </div>
        <div className='hidden gap-3 md:flex'>
          <Button
            className='bg-white hover:bg-background'
            variant='noShadow'
            size='icon'
            asChild
          >
            <Link href={session ? '/account' : '/signup'}>
              <User />
            </Link>
          </Button>
          <LangDataAllowed>
            <Button
              className='bg-white hover:bg-background'
              variant='noShadow'
              size='icon'
              asChild
            >
              <Link href='/data'>
                <Admin />
              </Link>
            </Button>
          </LangDataAllowed>
        </div>
      </div>
    </header>
  );
}
export default Header;
