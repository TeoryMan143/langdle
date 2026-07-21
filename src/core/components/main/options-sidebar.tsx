'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/modules/auth/context';
import Admin from '../icons/admin';
import Home from '../icons/home';
import Language from '../icons/language';
import SolidBars from '../icons/solid-bars';
import User from '../icons/user';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import LangDataAllowed from './lang-data-allowed';
import LocaleSelector from './locale-selector';

function OptionsSidebar() {
  const { session } = useAuth();
  const t = useTranslations('Nav');

  return (
    <Drawer direction='right'>
      <DrawerTrigger asChild>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
        >
          <SolidBars />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='p-5'>
        <DrawerTitle className='text-xl'>{t('options')}</DrawerTitle>
        <ul className='flex flex-col gap-3 p-3'>
          <SidebarLink href='/'>
            <Home /> {t('home')}
          </SidebarLink>
          <SidebarLink href='/howtoplay'>{`? ${t('howToPlay')}`}</SidebarLink>
          <SidebarLink href='/data/public'>
            <Language /> {t('publicData')}
          </SidebarLink>
          <SidebarLink href={session ? '/account' : '/signup'}>
            <User /> {session ? t('account') : t('signUp')}
          </SidebarLink>
          <LangDataAllowed>
            <SidebarLink href='/data'>
              <Admin /> {t('data')}
            </SidebarLink>
          </LangDataAllowed>
        </ul>
        <LocaleSelector className='absolute bottom-2 right-1.5 max-w-[90%]' />
      </DrawerContent>
    </Drawer>
  );
}

function SidebarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li className='relative rounded-xl overflow-clip'>
      <Link
        href={href}
        className='text-lg text-gray-700 hover:text-black group bg-none transition-colors'
      >
        <div className='absolute h-[150%] bg-main w-full scale-x-0 group-hover:scale-x-100 transition-transform' />
        <div className='z-40 relative flex gap-2 items-center justify-center py-2'>
          {children}
        </div>
      </Link>
    </li>
  );
}

export default OptionsSidebar;
