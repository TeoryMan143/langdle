'use client';

import Send from '@/core/components/icons/send';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import GuessesTable from './guesses-table';

function Game() {
  return (
    <div className='space-y-6 flex flex-col items-center'>
      <div className='flex items-center h-14 gap-2 w-[95%]'>
        <Input className='text-center h-full' placeholder='Type your guess' />
        <Button className='h-full'>
          Guess
          <Send />
        </Button>
      </div>
      <p className='text-gray-600'>Attempts left: x</p>
      <GuessesTable />
    </div>
  );
}
export default Game;
