import { firstNonBlank, isBlank } from '../utils/strings.js'

const DEFAULT_BASE_URL = 'https://openlibrary.org'

interface BookLookupQuery {
  title?: string | null
  author?: string | null
}

export interface BookLookupResult {
  title: string
  author: string
  coverImageUri?: string
  publishedYear?: number
}

interface OpenLibrarySearchDoc {
  title?: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[]
}

function coverImageUrlFor (coverId?: number): string | undefined {
  return coverId != null ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined
}

/**
 * Looks up canonical book metadata (author, cover art) from Open Library
 * given a rough title/author guess. This is used to clean up whatever the
 * vision model returns and to find real cover art.
 */
export async function lookupBookMetadata ({ title, author }: BookLookupQuery): Promise<BookLookupResult | null> {
  if (isBlank(title) && isBlank(author)) return null

  const baseUrl = process.env.OPEN_LIBRARY_BASE_URL ?? DEFAULT_BASE_URL
  const params = new URLSearchParams({
    limit: '1',
    fields: 'title,author_name,cover_i,first_publish_year'
  })
  if (!isBlank(title)) params.set('title', title)
  if (!isBlank(author)) params.set('author', author)

  // Potential for fallback logic:
  // Look up by title and find close matching author
  // Look up by author and find close matching title
  let response: Response
  try {
    response = await fetch(`${baseUrl}/search.json?${params.toString()}`)
  } catch {
    return null
  }

  if (!response.ok) return null

  const payload = (await response.json().catch(() => null)) as OpenLibrarySearchResponse | null
  const match = payload?.docs?.[0]
  if (match == null) return null

  return {
    title: firstNonBlank(match.title, title),
    author: firstNonBlank(match.author_name?.[0], author),
    coverImageUri: coverImageUrlFor(match.cover_i),
    publishedYear: match.first_publish_year
  }
}
