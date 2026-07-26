const DEFAULT_LIBRARY_CATALOG_BASE_URL = 'https://multcolib.bibliocommons.com'

/**
 * Builds a link to a library catalog's smart search for a book title. Book
 * IDs don't carry over between systems, so this just opens a search rather
 * than trying to link a specific catalog record.
 *
 * Most library systems (at least the ones checked so far) run on
 * BiblioCommons with just a different subdomain per system, e.g.
 * multcolib.bibliocommons.com vs seattlepubliclibrary.bibliocommons.com.
 * Right now LIBRARY_CATALOG_BASE_URL is a single server-wide env var, which
 * only supports one library system for the whole deployment. A nice future
 * improvement would be making this configurable per-device/per-user (e.g. a
 * setting stored client-side or per-account) so people with cards at
 * multiple library systems -- or multiple users of the same server -- can
 * each pick their own.
 */
export function buildLibrarySearchUrl (title: string): string {
  const baseUrl = process.env.LIBRARY_CATALOG_BASE_URL ?? DEFAULT_LIBRARY_CATALOG_BASE_URL
  const params = new URLSearchParams({ query: title, searchType: 'smart' })
  return `${baseUrl}/v2/search?${params.toString()}`
}
