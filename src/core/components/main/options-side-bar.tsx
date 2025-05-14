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
import { getLangPermissions } from '@/modules/lang-data/actions';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

function OptionsSideBar() {
  const { user } = useAuth();

  const { data: permissions, error } = useQuery({
    queryKey: [user?.id, 'langPermissions'],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const permissions = await getLangPermissions(user.id);

      if (!permissions.success) {
        console.error(permissions.error);
        return [];
      }

      return permissions.result;
    },
  });

  if (error) {
    toast.error(error.message);
  }

  // const showLangData = useMemo(() =>  user?.admin || permissions?.length < 0, [user?.admin, permissions]);

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
