import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

import { StatusPicker } from '../components/StatusPicker';
import { useBooks } from '../context/BooksContext';
import type { RootStackParamList } from '../navigation/types';
import { scanBookCover } from '../services/booksApi';
import type { BookStatus } from '../types/book';
import { openLibrarySearch } from '../utils/openLibrarySearch';

type Props = NativeStackScreenProps<RootStackParamList, 'BookForm'>;

function isDeviceLocalUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):/i.test(uri);
}

export function BookFormScreen({ navigation, route }: Props) {
  const { bookId, coverImageUri, suggestedTitle, suggestedAuthor } =
    route.params;
  const isEditing = Boolean(bookId);
  const { loadBook, addBook, updateBook, removeBook } = useBooks();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [title, setTitle] = useState(suggestedTitle ?? '');
  const [author, setAuthor] = useState(suggestedAuthor ?? '');
  const [status, setStatus] = useState<BookStatus>('to read');
  const [notes, setNotes] = useState('');
  const [coverUri, setCoverUri] = useState<string | undefined>(coverImageUri);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!bookId) {
      return;
    }

    loadBook(bookId)
      .then(book => {
        setTitle(book.title);
        setAuthor(book.author);
        setStatus(book.status);
        setNotes(book.notes ?? '');
        setCoverUri(book.coverImageUri);
      })
      .catch(error => {
        Alert.alert(
          'Could not load book',
          error instanceof Error ? error.message : 'Please try again.',
          [{ text: 'Back', onPress: () => navigation.goBack() }],
        );
      })
      .finally(() => setLoading(false));
  }, [bookId, loadBook, navigation]);

  async function handleCoverCapture(useCamera: boolean) {
    const launcher = useCamera ? launchCamera : launchImageLibrary;
    const result = await launcher({
      mediaType: 'photo',
      quality: 0.8,
      includeExtra: false,
      // iPhones default to HEIC for photos. The camera path here already
      // always yields JPEG, but picking an existing photo from the library
      // can hand back the original HEIC file -- "compatible" tells the
      // native picker to give us a JPEG-compatible representation instead,
      // so nothing downstream (OCR, <Image>, saving) needs to know or care.
      assetRepresentationMode: 'compatible',
      ...(useCamera
        ? {
            cameraType: 'back',
            saveToPhotos: false,
          }
        : {}),
    });

    if (result.didCancel || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    setWarnings([]);
    setScanning(true);
    setCoverUri(asset.uri);

    try {
      const { draft, warnings: scanWarnings } = await scanBookCover({
        uri: asset.uri!,
        type: asset.type,
        fileName: asset.fileName,
      });
      if (!title.trim() && draft.title) {
        setTitle(draft.title);
      }
      if (!author.trim() && draft.author) {
        setAuthor(draft.author);
      }
      // Prefer real catalog cover art when we find a match; otherwise keep
      // showing the photo the user just took/picked.
      if (draft.coverImageUri) {
        setCoverUri(draft.coverImageUri);
      }
      setWarnings(scanWarnings);
    } catch {
      setWarnings([
        'Something went wrong analyzing the photo. Fill in the details manually below.',
      ]);
    } finally {
      setScanning(false);
    }
  }

  function showCoverOptions() {
    Alert.alert('Add cover photo', 'Choose how to add a book cover image.', [
      { text: 'Take photo', onPress: () => handleCoverCapture(true) },
      { text: 'Choose from library', onPress: () => handleCoverCapture(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Please enter a book title.');
      return;
    }
    if (!trimmedAuthor) {
      Alert.alert('Author required', 'Please enter the book author.');
      return;
    }

    setSaving(true);
    try {
      const draft = {
        title: trimmedTitle,
        author: trimmedAuthor,
        status,
        notes: notes.trim() || undefined,
        // Device-local file URIs cannot be loaded by another client. The scan
        // API replaces the preview with a public catalog cover when available.
        coverImageUri:
          coverUri && !isDeviceLocalUri(coverUri) ? coverUri : undefined,
      };

      if (isEditing && bookId) {
        await updateBook(bookId, draft);
      } else {
        await addBook(draft);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error
          ? error.message
          : 'Could not save this book. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!bookId) {
      return;
    }

    Alert.alert('Delete book', 'Remove this book from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBook(bookId);
            navigation.goBack();
          } catch (error) {
            Alert.alert(
              'Delete failed',
              error instanceof Error
                ? error.message
                : 'Could not delete this book. Please try again.',
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FA5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Pressable style={styles.coverCard} onPress={showCoverOptions}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderIcon}>📷</Text>
              <Text style={styles.coverPlaceholderText}>Snap or add cover</Text>
            </View>
          )}
          {scanning ? (
            <View style={styles.scanOverlay}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.scanText}>Reading cover...</Text>
            </View>
          ) : null}
        </Pressable>

        {warnings.length > 0 ? (
          <View style={styles.noticeList}>
            {warnings.map(warning => (
              <View key={warning} style={styles.notice}>
                <Text style={styles.noticeText}>{warning}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Book title"
          placeholderTextColor="#98A2B3"
        />

        <Text style={styles.label}>Author</Text>
        <TextInput
          style={styles.input}
          value={author}
          onChangeText={setAuthor}
          placeholder="Author name"
          placeholderTextColor="#98A2B3"
        />

        {title.trim() ? (
          <Pressable
            style={styles.libraryLink}
            onPress={() => {
              openLibrarySearch(title.trim()).catch(() => {
                Alert.alert(
                  'Could not open library',
                  'The library catalog could not be opened. Please try again.',
                );
              });
            }}>
            <Text style={styles.libraryLinkText}>
              🔎 Search library for this title
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Status</Text>
        <StatusPicker value={status} onChange={setStatus} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          placeholderTextColor="#98A2B3"
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save changes' : 'Add book'}
            </Text>
          )}
        </Pressable>

        {isEditing ? (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete book</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
  coverCard: {
    alignSelf: 'center',
    width: 160,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#E8EEF5',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  coverPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noticeList: {
    gap: 8,
    marginBottom: 16,
  },
  notice: {
    backgroundColor: '#FDF3D9',
    borderWidth: 1,
    borderColor: '#EDD9A0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: '#6B5310',
    fontSize: 13,
    lineHeight: 18,
  },
  libraryLink: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 16,
  },
  libraryLinkText: {
    color: '#4A6FA5',
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 96,
  },
  saveButton: {
    backgroundColor: '#4A6FA5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '600',
  },
});
