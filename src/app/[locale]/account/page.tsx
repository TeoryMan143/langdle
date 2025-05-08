import { Button } from '@/core/components/ui/button';
import { auth } from '@/modules/auth/manager';
import { redirect, RedirectType } from 'next/navigation';

async function AccountPage() {
  const { user, session } = await auth();

  if (session == null) {
    redirect('/', RedirectType.replace);
  }

  return (
    <div>
      <h1 className='text-4xl text-center'>Account</h1>
      <p className='text-center'>{user.nickname}</p>
      <div className='flex justify-center'>
        <Button>Sign out</Button>
      </div>
    </div>
  );
}

export default AccountPage;
