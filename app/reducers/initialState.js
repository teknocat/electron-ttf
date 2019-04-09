import { remote } from 'electron';
import settings from 'electron-settings';
import os from 'os';
import is from 'electron-is';
import { convertPath } from '../utils/file';

const posix = !is.windows() && process.env.NODE_ENV !== 'test' ? require('posix-ext') : null;

// reducersのテストを通すためには独自ファイルを指定する必要がある
if (process.env.NODE_ENV === 'test') {
  settings.setPath('test.json');
}

const content = {
  activeView: settings.get('electronTTF.content.activeView', 'left'),
  left: {
    position: 0,
    items: [],
    path: settings.get('electronTTF.content.left.path', os.homedir()),
    sortType: settings.get(
      'electronTTF.content.left.sortType',
      'FileAscDirFirst'
    ),
    infoType: settings.get('electronTTF.content.left.infoType', 1),
    histories: [],
    isInvalidPath: false,
    needToRefresh: false,
    maskPattern: '*'
  },
  right: {
    position: 0,
    items: [],
    path: settings.get('electronTTF.content.right.path', os.homedir()),
    sortType: settings.get(
      'electronTTF.content.right.sortType',
      'FileAscDirFirst'
    ),
    infoType: settings.get('electronTTF.content.right.infoType', 1),
    histories: [],
    isInvalidPath: false,
    needToRefresh: false,
    maskPattern: '*'
  },
  fileAction: 'NONE',
  targetItem: null,
  actionState: 'INIT',
  isStart: false,
  isDone: false,
  isCanceled: false,
  needToConfirm: false,
  forced: false,
  overwriteIfNewer: false,
  overwriteIfNewerSubDirectory: false,
  itemRemains: [],
  enableCopyToFuse: false,
  viewMode: 'DIRECTORY'
};

export function getInitialState() {
  // console.log('getInitialState:', content);
  let cliFlags;
  if (process.env.NODE_ENV === 'test') {
    cliFlags = {};
  } else {
    ({ cliFlags } = remote.getGlobal('sharedObject'));
  }
  // console.log('cliFlags', cliFlags);
  if (cliFlags.L) {
    content.left.path = convertPath(cliFlags.L, process.cwd());
  }
  if (cliFlags.R) {
    content.right.path = convertPath(cliFlags.R, process.cwd());
  }
  if (cliFlags.enableCopyToFuse) {
    content.enableCopyToFuse = cliFlags.enableCopyToFuse;
  }
  return content;
}

const preferences = {
  terminalEmulator: posix
    ? 'xfce4-terminal --working-directory=$P'
    : 'start cmd',
  kbd101: false,
  // TODO windowsで設定すべき値の検討
  watchExcludes: is.windows() ? [] : ['/dev', '/var/log'],
  showPathOnTitleBar: false,
  favoritePathList: []
};

export function getInitialPreferences() {
  return preferences;
}
