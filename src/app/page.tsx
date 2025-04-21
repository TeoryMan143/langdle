import { dongle } from '@/core/lib/fonts';
import Game from '@/modules/daily-guess/components/game';

export default function Home() {
  return (
    <main className='pt-8'>
      <h2 className={`${dongle.className} text-7xl text-center`}>
        Guess the language of the day
      </h2>
      <section className='mt-16'>
        <Game />
      </section>
    </main>
  );
}
