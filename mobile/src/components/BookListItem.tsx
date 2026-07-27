import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { STATUS_COLORS, STATUS_LABELS } from '../constants/status';
import type { Book } from '../types/book';
import { openLibrarySearch } from '../utils/openLibrarySearch';

type Props = {
  book: Book;
  onPress: () => void;
};

export function BookListItem({ book, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        {book.coverImageUri ? (
          <Image source={{ uri: book.coverImageUri }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>📖</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author ? (
            <Text style={styles.author} numberOfLines={1}>
              {book.author}
            </Text>
          ) : null}
          <View
            style={[
              styles.badge,
              { backgroundColor: STATUS_COLORS[book.status] },
            ]}>
            <Text style={styles.badgeText}>{STATUS_LABELS[book.status]}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        style={styles.libraryLink}
        onPress={() => {
          openLibrarySearch(book.title).catch(() => {
            Alert.alert(
              'Could not open library',
              'The library catalog could not be opened. Please try again.',
            );
          });
        }}>
        <Text style={styles.libraryLinkText}>🔎 Search library</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  cover: {
    width: 52,
    height: 78,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
  },
  coverPlaceholder: {
    width: 52,
    height: 78,
    borderRadius: 6,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  libraryLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginLeft: 64,
  },
  libraryLinkText: {
    color: '#4A6FA5',
    fontSize: 13,
    fontWeight: '500',
  },
});
