import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/context';
import { getLangPermissions } from '@/modules/lang-data/actions';

function LangDataAllowed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

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

  return isSuccess && showLangData && children;
}

export default LangDataAllowed;
