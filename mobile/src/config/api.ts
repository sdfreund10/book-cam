import { NativeModules } from 'react-native';

const DEVELOPMENT_API_PORT = 4000;

/**
 * Set this to the public HTTPS origin used by release builds, without a
 * trailing slash (for example, "https://books.example.com").
 */
const PRODUCTION_API_BASE_URL: string = '';

type SourceCodeModule = {
  scriptURL?: string;
};

function developmentApiBaseUrl(): string {
  const scriptURL = (NativeModules.SourceCode as SourceCodeModule | undefined)
    ?.scriptURL;

  if (scriptURL) {
    try {
      const metroUrl = new URL(scriptURL);
      return `http://${metroUrl.hostname}:${DEVELOPMENT_API_PORT}`;
    } catch {
      // Fall through to the simulator-friendly default.
    }
  }

  return `http://localhost:${DEVELOPMENT_API_PORT}`;
}

export function getApiBaseUrl(): string {
  if (__DEV__) {
    return developmentApiBaseUrl();
  }

  if (!PRODUCTION_API_BASE_URL) {
    throw new Error(
      'The BookCamera API URL has not been configured for release builds.',
    );
  }

  return PRODUCTION_API_BASE_URL.replace(/\/+$/, '');
}
