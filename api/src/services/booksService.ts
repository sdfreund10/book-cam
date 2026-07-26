import { updateBook } from '../data/books.js'
import type { Book } from '../types/book.js'
import { lookupBookMetadata } from './bookLookupService.js'

export async function addCoverImage (book: Book): Promise<Book> {
  if (book.coverImageUri) {
    return book
  }

  const metadata = await lookupBookMetadata({ title: book.title, author: book.author })
  if (metadata?.coverImageUri == null) {
    return book
  }

  const updated = await updateBook(book.id, { coverImageUri: metadata.coverImageUri })
  return updated ?? book
}
