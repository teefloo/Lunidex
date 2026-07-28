const JSON_LD_ESCAPE_CHARACTERS: Readonly<Record<string, string>> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serializes schema data for an inline `application/ld+json` script.
 *
 * JSON permits `<`, but HTML parsers treat `</script>` as the end of an inline
 * script even when it appears inside a JSON string. Escaping the HTML-sensitive
 * characters also preserves JSON-LD semantics for consumers that parse it as
 * JSON instead of HTML.
 */
export function serializeJsonLd(value: object): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError('JSON-LD values must be serializable.');
  }

  return serialized.replace(/[<>&\u2028\u2029]/g, (character) => JSON_LD_ESCAPE_CHARACTERS[character]);
}

/**
 * Produces a display name safe to store in account metadata without rejecting
 * ordinary international names. Presentation output must still be contextually
 * escaped (for example with `serializeJsonLd` for inline JSON-LD).
 */
export function normalizeDisplayName(value: string): string | null {
  const withoutControls = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
  const normalized = withoutControls
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  return Array.from(normalized).slice(0, 80).join('');
}
