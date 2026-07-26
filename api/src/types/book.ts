export const BOOK_STATUSES = ['to read', 'owned', 'started', 'finished', 'abandoned'] as const
export type BookStatus = (typeof BOOK_STATUSES)[number]

import { type Book as BookSchema, type InsertBook } from '../data/schema.js';

export type Book = BookSchema;
export type BookDraft = InsertBook;
