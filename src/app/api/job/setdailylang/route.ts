import { NextRequest } from 'next/server';
import { setStringToKey } from '@/core/database/redis/key-getters';
import { getRandomInt } from '@/core/lib/utils';
import langRepository from '../../repositories/langs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const langs = await langRepository.getAll(true);

    const dayLang = langs[getRandomInt(0, langs.length - 1)];

    await setStringToKey('daylang', dayLang.id);
    console.log('DAYLANG: ', dayLang.id);
  } catch (e) {
    if (!(e instanceof Error)) {
      return new Response('unknown', { status: 500 });
    }

    return Response.json(
      {
        error: e.message,
      },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
