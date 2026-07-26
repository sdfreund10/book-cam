import { getApiBaseUrl } from '../config/api';
import type { Book, BookDraft } from '../types/book';

type DataResponse<T> = {
  data: T;
};

type ErrorResponse = {
  error?: string;
  details?: unknown;
};

type ApiBook = Omit<Book, 'id'> & {
  id: number | string;
};

export type CoverImageUpload = {
  uri: string;
  type?: string;
  fileName?: string;
};

export type ScanBookResult = {
  draft: Partial<BookDraft>;
  warnings: string[];
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function normalizeBook(book: ApiBook): Book {
  return {
    ...book,
    id: String(book.id),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let error: ErrorResponse | undefined;
    try {
      error = (await response.json()) as ErrorResponse;
    } catch {
      // The server may return an empty or non-JSON response.
    }

    throw new ApiError(
      error?.error || `The server returned ${response.status}.`,
      response.status,
      error?.details,
    );
  }

  return (await response.json()) as T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('configured')
        ? error.message
        : 'Could not connect to the BookCamera API.';
    throw new ApiError(message, 0);
  }

  return parseResponse<T>(response);
}

export async function listBooks(): Promise<Book[]> {
  const response = await request<DataResponse<ApiBook[]>>('/api/books');
  return response.data
    .map(normalizeBook)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function getBook(id: string): Promise<Book> {
  const response = await request<DataResponse<ApiBook>>(
    `/api/books/${encodeURIComponent(id)}`,
  );
  return normalizeBook(response.data);
}

export async function createBook(draft: BookDraft): Promise<Book> {
  const response = await request<DataResponse<ApiBook>>('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  return normalizeBook(response.data);
}

export async function updateBook(
  id: string,
  draft: BookDraft,
): Promise<Book> {
  const response = await request<DataResponse<ApiBook>>(
    `/api/books/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    },
  );
  return normalizeBook(response.data);
}

export async function deleteBook(id: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/api/books/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      },
    );
  } catch {
    throw new ApiError('Could not connect to the BookCamera API.', 0);
  }

  if (!response.ok) {
    await parseResponse<never>(response);
  }
}

export async function scanBookCover(
  image: CoverImageUpload,
): Promise<ScanBookResult> {
  const form = new FormData();
  form.append(
    'cover',
    {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'book-cover.jpg',
    } as unknown as Blob,
  );

  const response = await request<
    DataResponse<Partial<BookDraft>> & { warnings?: string[] }
  >('/api/books/scan', {
    method: 'POST',
    body: form,
  });

  return {
    draft: response.data,
    warnings: response.warnings ?? [],
  };
}
