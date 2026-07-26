import type { BookStatus } from '../types/book';

export const STATUS_LABELS: Record<BookStatus, string> = {
  'to read': 'To Read',
  owned: 'Owned',
  started: 'Started',
  finished: 'Finished',
  abandoned: 'Abandoned',
};

export const STATUS_COLORS: Record<BookStatus, string> = {
  'to read': '#4A6FA5',
  owned: '#6B5B95',
  started: '#E09F3E',
  finished: '#2D6A4F',
  abandoned: '#9B2226',
};
