import SigninForm from '@/modules/auth/components/signin-form';

function SigninPage() {
  return (
    <div>
      <h1 className='text-4xl text-center'>Sign In</h1>
      <div className='flex justify-center mt-5'>
        <div className='w-96'>
          <SigninForm />
        </div>
      </div>
    </div>
  );
}

export default SigninPage;
