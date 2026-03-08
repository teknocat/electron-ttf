// @flow
import settings from 'electron-settings';

export function settingsGet(key: string, defaultValue: any) {
  try {
    return settings.get(key, defaultValue);
  } catch (err) {
    return defaultValue;
  }
}

export function settingsSet(key: string, value: any) {
  try {
    settings.set(key, value);
  } catch (err) {
    // In environments where electron.remote is unavailable, fall back silently.
  }
}

export function settingsSetPath(path: string) {
  try {
    settings.setPath(path);
  } catch (err) {
    // Ignore path initialization errors in restricted renderer contexts.
  }
}
