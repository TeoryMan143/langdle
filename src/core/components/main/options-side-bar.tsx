import { useAuth } from '@/modules/auth/context';
import SolidBars from '../icons/solid-bars';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { useMemo } from 'react';
import Link from 'next/link';

function OptionsSideBar() {
  const { session, user } = useAuth();

  // const {}

  // const showLangData = useMemo(() => first, []);

  return (
    <Drawer>
      <DrawerClose />
      <DrawerTrigger>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
        >
          <SolidBars className='text-xl' />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className='text-2xl font-bold'>Options</DrawerTitle>
        <div className='flex flex-col gap-2 p-4'>
          <Link href='/'>si</Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default OptionsSideBar;
