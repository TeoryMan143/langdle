import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  if (!client) {
    client = createClient({
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: +(process.env.REDIS_PORT as string),
      },
    });

    client.on('error', err => {
      console.log('Redis error: ', err);
      client = null;
    });

    await client.connect();
  }

  return client;
}

export { getClient };
