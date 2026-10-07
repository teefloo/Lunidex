import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

async function audit(mode: 'valid' | 'canonical-404' | 'wrong-language' | 'missing-sitemap') {
  const directory = await mkdtemp(join(tmpdir(), 'lunidex-seo-test-'));
  const catalogFile = join(directory, 'catalog.json');
  const output = join(directory, 'report.json');
  const sets = [{ id: 'base1', name: 'Base Set' }, { id: 'base2', name: 'Jungle' }];
  await writeFile(catalogFile, JSON.stringify({ catalog: { en: sets, fr: sets } }));
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'https://lunidex.app');
    if (url.pathname === '/robots.txt') { response.end('User-agent: *\nAllow: /\nDisallow: /api/'); return; }
    if (url.pathname.startsWith('/sitemaps/')) {
      const locale = url.pathname.includes('-fr.') ? 'fr' : 'en';
      response.end(`<urlset>${sets.filter(set => mode !== 'missing-sitemap' || set.id !== 'base1').map(set => `<url><loc>https://lunidex.app/${locale}/tcg/sets/${set.id}</loc></url>`).join('')}</urlset>`);
      return;
    }
    const locale = url.pathname.split('/')[1];
    if (mode === 'canonical-404' && url.pathname.endsWith('/base1') && !url.search) {
      response.statusCode = 404; response.end('Missing'); return;
    }
    const query = mode !== 'wrong-language' && url.searchParams.get('tcgLang') === 'fr' ? '?tcgLang=fr' : '';
    const canonical = `https://lunidex.app${url.pathname}${query}`;
    response.setHeader('Content-Type', 'text/html');
    response.end(`<html lang="${locale}"><head><title>Set checklist</title><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}">${['en', 'fr'].map(lang => `<link rel="alternate" hreflang="${lang}" href="https://lunidex.app/${lang}/tcg/sets/${url.pathname.split('/').at(-1)}${query}">`).join('')}<meta property="og:title" content="Set"><meta property="og:description" content="Cards"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://lunidex.app/api/og/tcg-set?set=base1&amp;lang=en"></head><body>Cards</body></html>`);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture server is unavailable');
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/tcg-route-audit.mjs', '--base', `http://127.0.0.1:${address.port}`, '--catalog', catalogFile, '--locales', 'en,fr', '--sets', 'base1,base2', '--output', output], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', resolve);
    });
    const report: { errors: { message: string }[]; routes: { canonicalStatus: number }[] } = JSON.parse(await readFile(output, 'utf8'));
    return { code, report };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}

describe('TCG HTTP audit regression checks', () => {
  it('accepts consistent multilingual pages and their real canonical responses', async () => {
    const { code, report } = await audit('valid');
    expect(code).toBe(0);
    expect(report.errors).toEqual([]);
    expect(report.routes.every(route => route.canonicalStatus === 200)).toBe(true);
  });
  it('fails when an explicit English 200 points at a query-free 404', async () => {
    const { code, report } = await audit('canonical-404');
    expect(code).toBe(1);
    expect(report.errors.some(error => error.message === 'Canonical returns HTTP 404')).toBe(true);
  });
  it('fails when the canonical drops the requested data language', async () => {
    const { code, report } = await audit('wrong-language');
    expect(code).toBe(1);
    expect(report.errors.some(error => error.message.startsWith('Canonical language/path mismatch'))).toBe(true);
  });
  it('fails when an indexable canonical is missing from its locale sitemap', async () => {
    const { code, report } = await audit('missing-sitemap');
    expect(code).toBe(1);
    expect(report.errors.some(error => error.message === 'Indexable canonical is absent from sitemap')).toBe(true);
  });
});
