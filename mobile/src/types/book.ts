export const BOOK_STATUSES = [
  'to read',
  'owned',
  'started',
  'finished',
  'abandoned',
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export type Book = {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  coverImageUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type BookDraft = {
  title: string;
  author: string;
  status: BookStatus;
  coverImageUri?: string;
  notes?: string;
};
