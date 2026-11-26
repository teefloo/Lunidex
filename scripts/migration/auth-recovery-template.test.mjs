import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const template = await readFile(new URL('../../supabase/templates/recovery.html', import.meta.url), 'utf8');

test('password recovery template uses Supabase ConfirmationURL and preserves its safety copy', () => {
  assert.match(template, /href="\{\{ \.ConfirmationURL \}\}"/);
  assert.doesNotMatch(template, /\.SiteURL|\.TokenHash/);
  assert.match(template, /This one-time link is verified only after you submit the new password form\./);
  assert.match(template, /If you did not request a password reset, you can ignore this email\./);
});
