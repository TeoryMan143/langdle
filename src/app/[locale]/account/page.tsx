import SignOutButton from '@/modules/auth/components/signout-button';
import { auth } from '@/modules/auth/actions';
import { redirect, RedirectType } from 'next/navigation';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  return (
    <div>
      <h1 className='text-4xl text-center'>Account</h1>
      <p className='text-center'>{user.nickname}</p>
      <SignOutButton />
    </div>
  );
}

export default AccountPage;
