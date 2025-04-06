import { dongle } from '@/lib/fonts';

function Header() {
  return (
    <header className='bg-main flex justify-center items-center'>
      <h1
        className={`${dongle.className} text-8xl text-white text-center mt-2`}
      >
        LANGDLE
      </h1>
    </header>
  );
}
export default Header;
