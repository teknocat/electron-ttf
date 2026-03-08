// @flow
import settings from 'electron-settings';
import fs from 'fs';
import nodePath from 'path';

let isSettingsPathInitialized = false;

function ensureSettingsPathInitialized() {
  if (isSettingsPathInitialized) return;
  isSettingsPathInitialized = true;

  // In classic main process usage, electron-settings can resolve userData path.
  try {
    // $FlowFixMe
    // eslint-disable-next-line global-require
    const electron = require('electron');
    if (
      (electron && electron.app) ||
      (electron && electron.remote && electron.remote.app)
    ) {
      return;
    }
  } catch (err) {
    // Continue to fallback path initialization.
  }

  // Renderer on newer Electron may not have remote; provide explicit path.
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return;

  const configDir =
    process.env.XDG_CONFIG_HOME || nodePath.join(home, '.config');
  const appDir = nodePath.join(configDir, 'electron-ttf');
  const settingsFilePath = nodePath.join(appDir, 'electron-settings.json');

  try {
    fs.mkdirSync(appDir, { recursive: true });
    settings.setPath(settingsFilePath);
  } catch (err) {
    // Fall through; callers handle errors with defaults.
  }
}

export function settingsGet(key: string, defaultValue: any) {
  ensureSettingsPathInitialized();
  try {
    return settings.get(key, defaultValue);
  } catch (err) {
    return defaultValue;
  }
}

export function settingsSet(key: string, value: any) {
  ensureSettingsPathInitialized();
  try {
    settings.set(key, value);
  } catch (err) {
    // In environments where electron.remote is unavailable, fall back silently.
  }
}

export function settingsSetPath(path: string) {
  isSettingsPathInitialized = true;
  try {
    settings.setPath(path);
  } catch (err) {
    // Ignore path initialization errors in restricted renderer contexts.
  }
}
