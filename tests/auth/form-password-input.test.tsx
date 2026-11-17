import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import FormPasswordInput from '@/modules/auth/components/form-password-input';

// The eye icon is drawn by the animation library. What the server sends is its
// initial frame: the closed eye, with the pupil scaled to nothing.
test('renders a password input with the closed eye icon', () => {
  const html = renderToStaticMarkup(<FormPasswordInput name='password' />);

  expect(html).toContain('<input type="password"');
  expect(html).toContain('name="password"');
  expect(html).toContain(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" stroke="var(--ring)">' +
      '<path d="M2 10s3.5 4 10 4s10-4 10-4M4 11.645L2 14m20 0l-1.996-2.352M8.914 13.68L8 16.5m7.063-2.812L16 16.5"></path>' +
      '<circle cx="12" cy="12" r="3" style="transform:scale(0);transform-origin:50% 50%;transform-box:fill-box"></circle>' +
      '</g></svg>',
  );
});
