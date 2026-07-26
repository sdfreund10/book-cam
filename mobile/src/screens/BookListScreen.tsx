import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BookListItem } from '../components/BookListItem';
import { STATUS_LABELS } from '../constants/status';
import { useBooks } from '../context/BooksContext';
import type { RootStackParamList } from '../navigation/types';
import { BOOK_STATUSES, type BookStatus } from '../types/book';

type Props = NativeStackScreenProps<RootStackParamList, 'BookList'>;

export function BookListScreen({ navigation }: Props) {
  const { books, loading, error, refresh } = useBooks();
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('BookForm', {})}
          style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Add</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const filteredBooks = useMemo(() => {
    if (statusFilter === 'all') {
      return books;
    }
    return books.filter(book => book.status === statusFilter);
  }, [books, statusFilter]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <FilterChip
          label="All"
          selected={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
        />
        {BOOK_STATUSES.map(status => (
          <FilterChip
            key={status}
            label={STATUS_LABELS[status]}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(status)}
          />
        ))}
      </View>

      {loading && books.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A6FA5" />
        </View>
      ) : error && books.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Could not load books</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id}
          contentContainerStyle={
            filteredBooks.length === 0 ? styles.emptyList : styles.list
          }
          refreshing={loading}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No books yet</Text>
              <Text style={styles.emptySubtitle}>
                Add a book manually or snap a cover photo to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookListItem
              book={item}
              onPress={() =>
                navigation.navigate('BookForm', { bookId: item.id })
              }
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('BookForm', {})}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    color: '#4A6FA5',
    fontSize: 16,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  filterChipSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  filterChipText: {
    fontSize: 12,
    color: '#344054',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
    paddingBottom: 96,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 96,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A6FA5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
  },
});
