import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import messages from '@/../messages/en.json';
import Feature from '@/modules/lang-guess/components/feature';

const render = (match: 'correct' | 'partial' | 'incorrect') =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale='en' timeZone='UTC' messages={messages}>
      <Feature id='tones' match={match} />
    </NextIntlClientProvider>,
  );

// The cell is an animated element. Outside an animated list it renders as a
// plain div: its own classes and transform origin, and no animation state.
test('renders the translated feature inside its animated cell', () => {
  expect(render('correct')).toContain(
    '<div class="md:h-12 bg-secondary-background flex items-center justify-center gap-2 rounded-base shadow-shadow p-1 md:p-3 border-2 border-border" style="transform-origin:center bottom">',
  );
  expect(render('correct')).toContain('Tones</div>');
});

test.each([
  ['correct', 'text-main'],
  ['partial', 'text-amber-400'],
  ['incorrect', 'text-danger'],
] as const)('a %s match shows its own icon', (match, colour) => {
  expect(render(match)).toContain(colour);
});
