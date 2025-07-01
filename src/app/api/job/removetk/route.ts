import { lt } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/core/database/relational/config';
import { langTokenTable } from '@/core/database/relational/tables';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    await db
      .delete(langTokenTable)
      .where(lt(langTokenTable.expiresAt, new Date()));
    console.log('Expired language tokens deleted successfully');
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
