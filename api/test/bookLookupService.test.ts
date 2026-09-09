import { afterEach, describe, expect, it, vi } from 'vitest'

import { lookupBookMetadata } from '../src/services/bookLookupService.js'

describe('lookupBookMetadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns null without fetching when title and author are blank', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupBookMetadata({ title: '', author: null })).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the network request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(
      lookupBookMetadata({ title: 'Dune', author: 'Frank Herbert' })
    ).resolves.toBeNull()
  })

  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({})
    }))

    await expect(
      lookupBookMetadata({ title: 'Dune', author: 'Frank Herbert' })
    ).resolves.toBeNull()
  })

  it('returns null when docs are empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [] })
    }))

    await expect(
      lookupBookMetadata({ title: 'Unknown Book', author: 'Nobody' })
    ).resolves.toBeNull()
  })

  it('maps a matching doc to metadata with a cover CDN URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [
          {
            title: 'The Left Hand of Darkness',
            author_name: ['Ursula K. Le Guin'],
            cover_i: 8739161,
            first_publish_year: 1969
          }
        ]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupBookMetadata({
      title: 'Left Hand of Darkness',
      author: 'Le Guin'
    })

    expect(result).toEqual({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      coverImageUri: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
      publishedYear: 1969
    })

    const requestedUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestedUrl).toContain('/search.json?')
    expect(requestedUrl).toContain('title=Left+Hand+of+Darkness')
    expect(requestedUrl).toContain('author=Le+Guin')
  })

  it('falls back to the query title and author when the doc omits them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [{ cover_i: 42 }]
      })
    }))

    const result = await lookupBookMetadata({
      title: 'Neuromancer',
      author: 'William Gibson'
    })

    expect(result).toEqual({
      title: 'Neuromancer',
      author: 'William Gibson',
      coverImageUri: 'https://covers.openlibrary.org/b/id/42-L.jpg',
      publishedYear: undefined
    })
  })
})
