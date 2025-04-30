import { createClient } from 'redis';

const client = createClient({
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: +(process.env.REDIS_PORT as string),
  },
});

client.on('error', err => {
  console.log('Redis error: ', err);
});

await client.connect();

export { client };
