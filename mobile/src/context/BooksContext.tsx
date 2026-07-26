import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createBook,
  deleteBook,
  getBook,
  listBooks,
  updateBook as updateBookRequest,
} from '../services/booksApi';
import type { Book, BookDraft } from '../types/book';

type BooksContextValue = {
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadBook: (id: string) => Promise<Book>;
  addBook: (draft: BookDraft) => Promise<Book>;
  updateBook: (id: string, draft: BookDraft) => Promise<Book>;
  removeBook: (id: string) => Promise<void>;
};

const BooksContext = createContext<BooksContextValue | null>(null);

export function BooksProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextBooks = await listBooks();
      setBooks(nextBooks);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not load books.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadBook = useCallback(async (id: string) => getBook(id), []);

  const addBook = useCallback(async (draft: BookDraft) => {
    const book = await createBook(draft);
    setBooks(current => [book, ...current]);
    return book;
  }, []);

  const updateBook = useCallback(async (id: string, draft: BookDraft) => {
    const book = await updateBookRequest(id, draft);
    setBooks(current =>
      current
        .map(item => (item.id === id ? book : item))
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    );
    return book;
  }, []);

  const removeBook = useCallback(async (id: string) => {
    await deleteBook(id);
    setBooks(current => current.filter(book => book.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      books,
      loading,
      error,
      refresh,
      loadBook,
      addBook,
      updateBook,
      removeBook,
    }),
    [
      books,
      loading,
      error,
      refresh,
      loadBook,
      addBook,
      updateBook,
      removeBook,
    ],
  );

  return (
    <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
  );
}

export function useBooks() {
  const context = useContext(BooksContext);
  if (!context) {
    throw new Error('useBooks must be used within BooksProvider');
  }
  return context;
}
