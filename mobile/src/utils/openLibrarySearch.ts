import { Linking } from 'react-native';

import { buildLibrarySearchUrl } from './libraryLink';

/**
 * Opens a library catalog title search in the system browser (Safari on iOS).
 * Full Safari is a better fit for library-card login and keeping a catalog tab.
 */
export async function openLibrarySearch(title: string): Promise<void> {
  await Linking.openURL(buildLibrarySearchUrl(title));
}
