import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { BookFormScreen } from '../screens/BookFormScreen';
import { BookListScreen } from '../screens/BookListScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#F5F7FA' },
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#F5F7FA' },
      }}>
      <Stack.Screen
        name="BookList"
        component={BookListScreen}
        options={{ title: 'My Books' }}
      />
      <Stack.Screen
        name="BookForm"
        component={BookFormScreen}
        options={({ route }) => ({
          title: route.params.bookId ? 'Edit Book' : 'Add Book',
        })}
      />
    </Stack.Navigator>
  );
}
