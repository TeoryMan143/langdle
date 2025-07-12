import { UserDTO } from '../types';

function AccountData({ user }: { user: UserDTO }) {
  return (
    <div className='my-5'>
      <div className='flex justify-center items-center gap-2'>
        <img
          className='h-4 rounded-sm'
          alt={`${user.country}-flag`}
          src={`http://purecatamphetamine.github.io/country-flag-icons/3x2/${user.country}.svg`}
        />
        <p className='text-center'>{user.nickname}</p>
      </div>
    </div>
  );
}

export default AccountData;
