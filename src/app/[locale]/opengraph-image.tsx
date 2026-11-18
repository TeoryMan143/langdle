import { ImageResponse } from 'next/og';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// The social preview every page shares, in the viewer's locale. Next links it
// as `/<locale>/opengraph-image`; `proxy.ts` lets that URL through untouched.
//
// Satori cannot read the oklch tokens of globals.css, so these are their sRGB
// equivalents: --main, --background, --soft-det and --border.
const MAIN = '#6ea5ff';
const BACKGROUND = '#dcebfe';
const SOFT_DET = '#375b93';
const BORDER = '#000000';

export const alt = 'Langdle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: 'Home',
  });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BACKGROUND,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '56px 88px',
          background: MAIN,
          border: `6px solid ${BORDER}`,
          borderRadius: 16,
          boxShadow: `14px 14px 0 0 ${BORDER}`,
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: 6,
            color: 'white',
            lineHeight: 1,
          }}
        >
          LANGDLE
        </div>
        <div
          style={{
            marginTop: 28,
            padding: '10px 28px',
            fontSize: 44,
            color: BORDER,
            background: 'white',
            border: `4px solid ${BORDER}`,
            borderRadius: 10,
          }}
        >
          {t('title')}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          fontSize: 28,
          color: SOFT_DET,
          letterSpacing: 4,
        }}
      >
        langdle
      </div>
    </div>,
    size,
  );
}
