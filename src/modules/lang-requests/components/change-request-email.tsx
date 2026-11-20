import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';
import type { ChangeRequestState } from '../types';

/*
 * Email clients do not run our Tailwind theme, so the neobrutalism tokens of
 * globals.css (see DESIGN_SYSTEM.md) are spelled out here as hex values:
 * 2px black borders, hard 4px shadow, 5px radius, bold type.
 */
const COLORS = {
  background: '#e2e9f9',
  surface: '#ffffff',
  main: '#5c93f6',
  foreground: '#000000',
  muted: '#2d4f9a',
  accepted: { bg: '#d1fae5', text: '#022c22' },
  rejected: { bg: '#fee2e2', text: '#450a0a' },
};

const FONT = "'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BORDER = `2px solid ${COLORS.foreground}`;
const SHADOW = `4px 4px 0 0 ${COLORS.foreground}`;

const styles = {
  body: {
    backgroundColor: COLORS.background,
    color: COLORS.foreground,
    fontFamily: FONT,
    fontWeight: 500,
    margin: 0,
    padding: '32px 16px',
  },
  card: {
    backgroundColor: COLORS.surface,
    border: BORDER,
    borderRadius: '5px',
    boxShadow: SHADOW,
    maxWidth: '520px',
    overflow: 'hidden',
    padding: 0,
  },
  header: {
    backgroundColor: COLORS.main,
    borderBottom: BORDER,
    padding: '16px 24px',
  },
  logo: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '2px',
    lineHeight: '32px',
    margin: 0,
  },
  content: { padding: '24px' },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: '28px',
    margin: '12px 0 0',
  },
  text: { fontSize: '15px', lineHeight: '24px', margin: '16px 0 0' },
  reason: {
    backgroundColor: COLORS.rejected.bg,
    border: BORDER,
    borderRadius: '5px',
    color: COLORS.rejected.text,
    fontSize: '15px',
    lineHeight: '24px',
    margin: '20px 0 0',
    padding: '12px 16px',
    whiteSpace: 'pre-line' as const,
  },
  button: {
    backgroundColor: COLORS.main,
    border: BORDER,
    borderRadius: '5px',
    boxShadow: SHADOW,
    color: COLORS.foreground,
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 20px',
    textDecoration: 'none',
  },
  footer: {
    color: COLORS.muted,
    fontSize: '12px',
    margin: '24px 0 0',
    textAlign: 'center' as const,
  },
};

type Props = {
  state: Exclude<ChangeRequestState, 'pending'>;
  /** Everything below arrives already translated. */
  subject: string;
  stateLabel: string;
  title: string;
  body: string;
  reasonLabel?: string;
  reason?: string;
  linkLabel: string;
  linkUrl: string;
};

function ChangeRequestEmail({
  state,
  subject,
  stateLabel,
  title,
  body,
  reasonLabel,
  reason,
  linkLabel,
  linkUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.card}>
          <Section style={styles.header}>
            <Heading as='h1' style={styles.logo}>
              LANGDLE
            </Heading>
          </Section>

          <Section style={styles.content}>
            <Text
              style={{
                backgroundColor: COLORS[state].bg,
                border: BORDER,
                borderRadius: '5px',
                color: COLORS[state].text,
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 500,
                margin: 0,
                padding: '2px 10px',
              }}
            >
              {stateLabel}
            </Text>

            <Heading as='h2' style={styles.title}>
              {title}
            </Heading>

            <Text style={styles.text}>{body}</Text>

            {reason && (
              <Text style={styles.reason}>
                <strong>{reasonLabel}</strong>
                <br />
                {reason}
              </Text>
            )}

            <Section style={{ margin: '28px 0 8px' }}>
              <Button href={linkUrl} style={styles.button}>
                {linkLabel}
              </Button>
            </Section>
          </Section>
        </Container>

        <Text style={styles.footer}>Langdle</Text>
      </Body>
    </Html>
  );
}

export default ChangeRequestEmail;
