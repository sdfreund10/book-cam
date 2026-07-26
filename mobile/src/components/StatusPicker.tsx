import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STATUS_COLORS, STATUS_LABELS } from '../constants/status';
import { BOOK_STATUSES, type BookStatus } from '../types/book';

type Props = {
  value: BookStatus;
  onChange: (status: BookStatus) => void;
};

export function StatusPicker({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {BOOK_STATUSES.map(status => {
        const selected = status === value;
        return (
          <Pressable
            key={status}
            onPress={() => onChange(status)}
            style={[
              styles.chip,
              selected && {
                backgroundColor: STATUS_COLORS[status],
                borderColor: STATUS_COLORS[status],
              },
            ]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {STATUS_LABELS[status]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    color: '#344054',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
