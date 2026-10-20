// Run from the repository root. Uses captured public API payloads, with no network or database access.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';

const directory = new URL('./', import.meta.url);
const sample = JSON.parse(await readFile(new URL('live-price-sample.json', directory), 'utf8'));
const bundle = await build({
  stdin: {
    contents: "export { getInvestmentReferenceQuote } from './src/lib/tcg-investments'; export { getTCGVariantValue, getCardMarketValue } from './src/lib/tcg-collection';",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'tsconfig.json',
});
const compiled = { exports: {} };
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(compiled, compiled.exports, createRequire(import.meta.url));
const { getInvestmentReferenceQuote, getTCGVariantValue, getCardMarketValue } = compiled.exports;

// Execute only the existing pure extractor. Never import or invoke the HTTP GET handler.
const source = await readFile('src/app/api/tcg/price-history/[cardId]/route.ts', 'utf8');
const hasLegacyExtractor = source.includes('function extractPriceSnapshot');
const pureFunctions = hasLegacyExtractor ? source.slice(source.indexOf('function toFiniteNumberOrNull'), source.indexOf('function hasAnyPrice')) : '';
const javascript = ts.transpileModule(pureFunctions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const extractPriceSnapshot = hasLegacyExtractor ? new Function(`${javascript}\nreturn extractPriceSnapshot;`)() : () => null;

const results = sample.filter((entry) => entry.status === 200).map((entry) => ({
  language: entry.language,
  id: entry.id,
  name: entry.name,
  catalogEUR: getCardMarketValue(entry, 'EUR'),
  standardFinishes: Object.fromEntries(['normal', 'holo', 'reverse'].filter((variant) => entry.variants?.[variant]).map((variant) => [variant, {
    collection: getTCGVariantValue(entry, variant, 'EUR'),
    investment: getInvestmentReferenceQuote(entry, variant, ''),
  }])),
  withPrintingDescription: getInvestmentReferenceQuote(entry, 'holo', 'PSA 10'),
  firstEdition: getInvestmentReferenceQuote(entry, 'firstEdition', ''),
  historyExtractor: extractPriceSnapshot(entry),
}));
await writeFile(new URL(hasLegacyExtractor ? 'price-resolution-results.json' : 'price-resolution-after.json', directory), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results.map(({ id, language, catalogEUR, standardFinishes, historyExtractor }) => ({
  id, language, catalogEUR: catalogEUR?.amount ?? null,
  investment: Object.fromEntries(Object.entries(standardFinishes).map(([variant, data]) => [variant, data.investment?.amount ?? null])),
  historyEUR: historyExtractor?.cardmarket_trend ?? null,
})), null, 2));
