import { render } from 'react-email';
import { expect, test } from 'vitest';
import ChangeRequestEmail from '@/modules/lang-data/components/change-request-email';

const props = {
  subject: 'Your change request for Spanish was rejected',
  stateLabel: 'Rejected',
  title: 'Spanish · Tones',
  body: 'Hi ana, your request was rejected.',
  reasonLabel: 'Rejection reason',
  linkLabel: 'See all your requests',
  linkUrl: 'https://langdle.test/account',
};

test('a rejected email shows the reason and the link', async () => {
  const html = await render(
    <ChangeRequestEmail
      {...props}
      state='rejected'
      reason='Sources say it is not tonal <b>'
    />,
  );

  expect(html).toContain('Rejection reason');
  expect(html).toContain('Sources say it is not tonal &lt;b&gt;');
  expect(html).toContain('href="https://langdle.test/account"');
});

test('an accepted email has no reason block', async () => {
  const text = await render(
    <ChangeRequestEmail {...props} state='accepted' stateLabel='Accepted' />,
    { plainText: true },
  );

  expect(text.toLowerCase()).toContain('spanish');
  expect(text).not.toContain('Rejection reason');
});
