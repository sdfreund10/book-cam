import { asc, eq } from 'drizzle-orm'

import type { Book } from '../types/book.js'
import { db } from './connection.js'
import { booksTable, type InsertBook } from './schema.js'

export async function listBooks (): Promise<Book[]> {
  return await db.select().from(booksTable).orderBy(asc(booksTable.createdAt))
}

export async function getBook (id: Book['id']): Promise<Book | undefined> {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, id)).limit(1)
  return book
}

export async function createBook (data: InsertBook): Promise<Book> {
  const [book] = await db.insert(booksTable).values(data).returning()
  if (book == null) throw new Error('Failed to create book')
  return book
}

export async function updateBook (
  id: Book['id'],
  data: Partial<Omit<Book, 'id'>>
): Promise<Book | undefined> {
  const [book] = await db.update(booksTable).set({
    ...data,
    updatedAt: new Date()
  }).where(eq(booksTable.id, id)).returning()
  return book
}

export async function deleteBook (id: Book['id']): Promise<boolean> {
  const [deleted] = await db.delete(booksTable).where(eq(booksTable.id, id)).returning({ id: booksTable.id })
  return deleted != null
}
