'use client';

import { useTranslations } from 'next-intl';
import { dongle } from '@/core/lib/fonts';
import { cn } from '@/core/lib/utils';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import Admin from '../icons/admin';
import Home from '../icons/home';
import Language from '../icons/language';
import User from '../icons/user';
import { buttonVariants } from '../ui/button';
import LangDataAllowed from './lang-data-allowed';
import LocaleSelector from './locale-selector';
import OptionsSidebar from './options-sidebar';

const navButtonClass = cn(
  buttonVariants({ variant: 'noShadow', size: 'icon' }),
  'bg-white hover:bg-background',
);

function Header() {
  const { session } = useAuth();
  const t = useTranslations('Nav');

  return (
    <header className='bg-main relative border-b-2 border-black'>
      <LocaleSelector className='absolute top-1/2 -translate-y-1/2 left-3 z-20 w-50 truncate hidden md:inline-flex' />
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
          <Link className={navButtonClass} href='/'>
            <Home />
          </Link>
          <Link className={navButtonClass} href='/howtoplay'>
            ?
          </Link>
          <Link
            className={navButtonClass}
            href='/data/public'
            aria-label={t('publicData')}
          >
            <Language />
          </Link>
          <Link
            className={navButtonClass}
            href={session ? '/account' : '/signup'}
          >
            <User />
          </Link>
          <LangDataAllowed>
            <Link className={navButtonClass} href='/data'>
              <Admin />
            </Link>
          </LangDataAllowed>
        </div>
      </div>
    </header>
  );
}
export default Header;
