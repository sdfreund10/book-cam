const DEFAULT_LIBRARY_CATALOG_BASE_URL = 'https://multcolib.bibliocommons.com';

/**
 * Mirrors api/src/utils/libraryLink.ts: builds a link to a library catalog's
 * smart search for a book title. Book IDs don't carry over between systems,
 * so this just opens a search rather than trying to link a specific record.
 *
 * Most library systems run on BiblioCommons with just a different subdomain
 * per system (e.g. multcolib.bibliocommons.com vs
 * seattlepubliclibrary.bibliocommons.com). This is hardcoded to one system
 * for now -- a nice future improvement would be making it configurable
 * per-device (e.g. a setting screen) so people with cards at multiple
 * library systems can pick the one they want without editing code.
 */
export function buildLibrarySearchUrl(title: string): string {
  const params = new URLSearchParams({ query: title, searchType: 'smart' });
  return `${DEFAULT_LIBRARY_CATALOG_BASE_URL}/v2/search?${params.toString()}`;
}
