import { UserDTO } from '../types';

function AccountData({ user }: { user: UserDTO }) {
  return (
    <div className='p-5 bg-background border-2 rounded-base space-y-3'>
      <div className='flex justify-center items-center gap-2'>
        <img
          className='h-8 rounded-sm aspect-video'
          alt={`${user.country}-flag`}
          src={`http://purecatamphetamine.github.io/country-flag-icons/3x2/${user.country}.svg`}
        />
        <h4 className='text-center text-2xl'>{user.nickname}</h4>
      </div>
      <div className='space-y-1'>
        <p>
          <strong>Native language: </strong> TODO
        </p>
        <p>
          <strong>Fluent in: </strong>
        </p>
        <ul>
          <li>TODO</li>
          <li>TODO</li>
        </ul>
      </div>
    </div>
  );
}

export default AccountData;
