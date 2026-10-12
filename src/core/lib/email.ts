import type { ReactElement } from 'react';
import { render } from 'react-email';
import { Resend } from 'resend';

type Email = {
  to: string;
  subject: string;
  react: ReactElement;
};

/**
 * Sends a transactional email through Resend. Like the services it swallows
 * and reports: a missing configuration or a provider failure is logged and
 * answered with `false`, so a notification never breaks the operation that
 * triggered it.
 */
export async function sendEmail({ to, subject, react }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error('Email not sent: RESEND_API_KEY or EMAIL_FROM is not set');
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject,
      react,
      text: await render(react, { plainText: true }),
    });

    if (error) {
      console.error('Email not sent:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Email not sent:', e);
    return false;
  }
}
