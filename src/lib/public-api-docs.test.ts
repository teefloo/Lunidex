import { describe, expect, it } from 'vitest';
import { GET } from '../app/api/v1/openapi.json/route';
import { API_GUIDE_OPERATIONS, API_GUIDE_QUOTAS } from '@/lib/public-api-docs';
import { buildStaticSitemapEntries } from '@/lib/sitemap';
import en from '@/lib/i18n/en';
import fr from '@/lib/i18n/fr';
import es from '@/lib/i18n/es';
import de from '@/lib/i18n/de';
import italian from '@/lib/i18n/it';
import ja from '@/lib/i18n/ja';
import ko from '@/lib/i18n/ko';
import zh from '@/lib/i18n/zh';

const localeBundles = { en, fr, es, de, it: italian, ja, ko, zh };
const httpMethods = new Set(['get', 'put', 'post', 'patch', 'delete']);

type OpenApiParameter = { name: string; in: string };
type OpenApiOperation = { parameters?: OpenApiParameter[] };
type OpenApiPathItem = {
  parameters?: OpenApiParameter[];
  get?: OpenApiOperation;
  put?: OpenApiOperation;
  post?: OpenApiOperation;
  patch?: OpenApiOperation;
};

function translationPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  return Object.entries(value).flatMap(([key, nested]) =>
    translationPaths(nested, prefix ? `${prefix}.${key}` : key),
  ).sort();
}

describe('public product and API documentation', () => {
  it('documents every published OpenAPI operation exactly once', async () => {
    const response = await GET();
    const document = await response.json() as {
      paths: Record<string, OpenApiPathItem>;
    };
    const publishedOperations = Object.entries(document.paths).flatMap(([path, pathItem]) =>
      Object.keys(pathItem)
        .filter((method) => httpMethods.has(method))
        .map((method) => `${method.toUpperCase()} ${path}`),
    ).sort();
    const documentedOperations = API_GUIDE_OPERATIONS
      .map(({ method, path }) => `${method} ${path}`)
      .sort();

      expect(documentedOperations).toEqual(publishedOperations);
  });

  it('keeps endpoint parameters aligned with the OpenAPI contract', async () => {
    const response = await GET();
    const document = await response.json() as { paths: Record<string, OpenApiPathItem> };
    const methodNames = { GET: 'get', PUT: 'put', POST: 'post', PATCH: 'patch' } as const;

    for (const guideOperation of API_GUIDE_OPERATIONS) {
      const pathItem = document.paths[guideOperation.path];
      const openApiOperation = pathItem?.[methodNames[guideOperation.method]];
      const contractParameters = [
        ...(pathItem?.parameters ?? []),
        ...(openApiOperation?.parameters ?? []),
      ].map(({ name, in: location }) => `${location}:${name}`).sort();
      const guideParameters = (('parameters' in guideOperation ? guideOperation.parameters : undefined) ?? [])
        .map(({ name, location }) => `${location}:${name}`)
        .sort();

      expect(openApiOperation, `${guideOperation.method} ${guideOperation.path}`).toBeDefined();
      expect(guideParameters, `${guideOperation.method} ${guideOperation.path}`).toEqual(contractParameters);
    }
  });

  it('keeps published per-account and global quotas aligned with the guide', async () => {
    const response = await GET();
    const document = await response.json() as { info: { description: string } };
    const contract = document.info.description;

    expect(contract).toContain(`${API_GUIDE_QUOTAS.readsPerMinute} reads/minute`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.writesPerMinute} writes/minute`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.readsPerDay.toLocaleString('en-US')} reads/day`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.writesPerDay} writes/day`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.cardDetailsPerDay} reads/day per account`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.sealedCalculationsPerDay} reads/day per account`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.cardDetailsGlobalPerDay.toLocaleString('en-US')} operations/day globally`);
    expect(contract).toContain(`${API_GUIDE_QUOTAS.sealedCalculationsGlobalPerDay.toLocaleString('en-US')} operations/day globally`);
  });

  it('includes the localized developer guide in the static sitemap', () => {
    const entry = buildStaticSitemapEntries().find(({ url }) => url.endsWith('/en/docs/api'));

    expect(entry?.alternates).toMatchObject({
      en: 'https://lunidex.app/en/docs/api',
      fr: 'https://lunidex.app/fr/docs/api',
      es: 'https://lunidex.app/es/docs/api',
      de: 'https://lunidex.app/de/docs/api',
      it: 'https://lunidex.app/it/docs/api',
      ja: 'https://lunidex.app/ja/docs/api',
      ko: 'https://lunidex.app/ko/docs/api',
      zh: 'https://lunidex.app/zh/docs/api',
      'x-default': 'https://lunidex.app/en/docs/api',
    });
  });

  it('includes the localized documentation index in the static sitemap', () => {
    const entry = buildStaticSitemapEntries().find(({ url }) => url.endsWith('/en/docs'));

    expect(entry?.alternates).toMatchObject({
      en: 'https://lunidex.app/en/docs',
      fr: 'https://lunidex.app/fr/docs',
      es: 'https://lunidex.app/es/docs',
      de: 'https://lunidex.app/de/docs',
      it: 'https://lunidex.app/it/docs',
      ja: 'https://lunidex.app/ja/docs',
      ko: 'https://lunidex.app/ko/docs',
      zh: 'https://lunidex.app/zh/docs',
      'x-default': 'https://lunidex.app/en/docs',
    });
  });

  it('has a localized label for every documented operation in all supported languages', () => {
    const englishApiDocs = (en.translation as Record<string, unknown>).api_docs;
    const englishPaths = translationPaths(englishApiDocs);

    for (const [language, bundle] of Object.entries(localeBundles)) {
      const apiDocs = (bundle.translation as Record<string, unknown>).api_docs as Record<string, unknown>;
      const operations = apiDocs.operations as Record<string, unknown>;

      expect(translationPaths(apiDocs), `${language}: translation key coverage`).toEqual(englishPaths);

      for (const [key, value] of Object.entries(apiDocs)) {
        if (typeof value === 'string') {
          expect(value.trim(), `${language}: ${key}`).not.toBe('');
        }
      }

      for (const operation of API_GUIDE_OPERATIONS) {
        expect(operations[operation.translationKey], `${language}: ${operation.translationKey}`)
          .toEqual(expect.any(String));
        expect((operations[operation.translationKey] as string).trim()).not.toBe('');
      }

      for (const key of [
        'page_title', 'meta_title', 'meta_description', 'security_warning', 'toc_title',
        'quickstart_title', 'auth_title', 'pagination_title', 'routes_title', 'cards_title',
        'sealed_title', 'sealed_summary_missing', 'mutations_title', 'errors_title', 'quotas_title',
      ]) {
        expect(apiDocs[key], `${language}: ${key}`).toEqual(expect.any(String));
        expect((apiDocs[key] as string).trim()).not.toBe('');
      }
    }
  });

  it('keeps the product documentation complete in every supported language', () => {
    const englishDocs = (en.translation as Record<string, unknown>).docs;
    const docsPaths = translationPaths(englishDocs);

    for (const [language, bundle] of Object.entries(localeBundles)) {
      const docs = (bundle.translation as Record<string, unknown>).docs as Record<string, unknown>;

      expect(translationPaths(docs), `${language}: documentation translation keys`).toEqual(docsPaths);

      for (const [key, value] of Object.entries(docs)) {
        if (typeof value === 'string') {
          expect(value.trim(), `${language}: ${key}`).not.toBe('');
        }
      }
    }
  });
});
