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
    '<div class="md:h-12 bg-[#FDFBFB] flex items-center justify-center gap-2 rounded-[3px] shadow-xl p-1 md:p-3 border border-soft-det" style="transform-origin:center bottom">',
  );
  expect(render('correct')).toContain('Tones</div>');
});

test.each([
  ['correct', 'text-main'],
  ['partial', 'text-amber-400'],
  ['incorrect', 'text-[#FF2C2C]'],
] as const)('a %s match shows its own icon', (match, colour) => {
  expect(render(match)).toContain(colour);
});
