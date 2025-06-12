import { useAuth } from '@/modules/auth/context';
import { Button } from '../ui/button';
import { useMemo } from 'react';
import { getLangPermissions } from '@/modules/lang-data/actions';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Admin from '../icons/admin';
import { useRouter } from 'next/navigation';

function OptionsSideBar() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: permissions,
    error,
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
    isSuccess &&
    showLangData && (
      <Button
        className='bg-white hover:bg-background'
        variant='noShadow'
        size='icon'
        onClick={() => router.push('/data')}
      >
        <Admin />
      </Button>
    )
  );
}

export default OptionsSideBar;
