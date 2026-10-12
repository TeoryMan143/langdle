import { sendEmail } from '@/core/lib/email';
import type { FeatureStatus, LangFeatures } from '@/core/types';
import { routing } from '@/i18n/routing';
import ChangeRequestEmail from './components/change-request-email';

type EmailMessages = {
  Emails: {
    changeRequest: Record<
      | 'acceptedSubject'
      | 'acceptedBody'
      | 'rejectedSubject'
      | 'rejectedBody'
      | 'viewRequests',
      string
    >;
  };
  ChangeRequests: {
    rejectionReason: string;
    state: Record<'accepted' | 'rejected', string>;
  };
  Features: {
    name: Record<string, string>;
    changeRequest: Record<string, string>;
  };
  Exonyms: Record<string, string>;
};

type ChangeRequestEmailData = {
  to: string;
  nickname: string;
  locale: string;
  langId: string;
  langName: string;
  feature: LangFeatures;
  status: FeatureStatus;
  /** Present when the request was rejected. */
  reason?: string;
};

const STATUS_MESSAGE_KEYS = {
  present: 'statusPresent',
  partial: 'statusPartial',
  absent: 'statusNotPresent',
} as const;

/** Replaces every `{name}` of a message with its value. */
function fill(template: string, values: Record<string, string>) {
  return template.replace(
    /\{(\w+)\}/g,
    (_, name: string) => values[name] ?? '',
  );
}

/**
 * Messages are read straight from the translation files: the API is
 * locale-agnostic, so the locale the requester used travels with the request.
 */
async function loadMessages(locale: string): Promise<EmailMessages> {
  const safeLocale = routing.locales.find(l => l === locale) ?? 'en';
  return (await import(`../../../messages/${safeLocale}.json`)).default;
}

/** Tells the requester how their change request was resolved. */
export async function sendChangeRequestResolvedEmail(
  email: ChangeRequestEmailData,
) {
  const messages = await loadMessages(email.locale);
  const t = messages.Emails.changeRequest;
  const state = email.reason === undefined ? 'accepted' : 'rejected';

  const language = messages.Exonyms[email.langId] ?? email.langName;
  const feature = messages.Features.name[email.feature] ?? email.feature;

  const values = {
    nickname: email.nickname,
    language,
    feature,
    status:
      messages.Features.changeRequest[STATUS_MESSAGE_KEYS[email.status]] ??
      email.status,
  };

  const subject = fill(
    state === 'accepted' ? t.acceptedSubject : t.rejectedSubject,
    values,
  );

  return sendEmail({
    to: email.to,
    subject,
    react: (
      <ChangeRequestEmail
        state={state}
        subject={subject}
        stateLabel={messages.ChangeRequests.state[state]}
        title={`${language} · ${feature}`}
        body={fill(
          state === 'accepted' ? t.acceptedBody : t.rejectedBody,
          values,
        )}
        reasonLabel={messages.ChangeRequests.rejectionReason}
        reason={email.reason}
        linkLabel={t.viewRequests}
        linkUrl={`${process.env.NEXT_PUBLIC_BASE_URL}/account`}
      />
    ),
  });
}
