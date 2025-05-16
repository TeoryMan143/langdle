import { useAuth } from '@/modules/auth/context';
import SolidBars from '../icons/solid-bars';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
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

  const {
    data: permissions,
    error,
    isLoading,
    isSuccess,
  } = useQuery({
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

  const showLangData = useMemo(
    () => user?.admin || (permissions && permissions?.length > 0),
    [user?.admin, permissions],
  );

  return (
    <Drawer direction='right'>
      <DrawerClose />
      <DrawerTrigger asChild>
        <Button
          className='bg-white hover:bg-background'
          variant='noShadow'
          size='icon'
        >
          <SolidBars className='text-xl' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='p-3'>
        <DrawerTitle className='text-2xl font-bold mb-2'>Options</DrawerTitle>
        <DrawerDescription className='hidden'>
          A sidebar that shows the avialable options for the user
        </DrawerDescription>
        {isLoading && <p>Loading...</p>}
        {isSuccess && (
          <div className='flex flex-col gap-2'>
            {showLangData && (
              <Link
                className='hover:underline hover:font-bold transition-all'
                href='/data'
              >
                Language Data
              </Link>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default OptionsSideBar;
