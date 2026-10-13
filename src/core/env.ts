import { z } from 'zod';

const envSchema = z.object({
  REDIS_USER: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  DATABASE_URL: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string(),
  CRON_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  /** Comma separated iOS/Android OAuth client ids accepted in Google ID tokens. */
  GOOGLE_MOBILE_CLIENT_IDS: z.string().optional(),
  /** Comma separated bundle ids / service ids accepted in Apple ID tokens. */
  APPLE_CLIENT_IDS: z.string().optional(),
  /** Absolute URL of the Android release APK; the install entry stays hidden without it. */
  NEXT_PUBLIC_ANDROID_APP_URL: z.string().optional(),
  JWT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string(),
});

envSchema.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
