// @flow

export type ActionType = {
  +type: string,
  viewPosition?: string,
  items?: ?Array<ItemStateType>,
  sortType?: string,
  infoType?: number,
  mark?: boolean,

  targetItem?: ItemStateType,
  needToConfirm?: boolean,
  remains?: Array<ItemStateType>,
  row?: number,
  isInvalidPath?: boolean,
  isForced?: boolean,
  ifNewer?: boolean,
  ifNewerSubDirectory?: boolean,
  destDir?: string,

  dstFileName?: ?string,
  isSucceeded?: boolean,

  isError?: boolean,
  logMessage?: string,

  path?: string,
  cursorPosition?: number,
  currentPath?: string,
  currentPosition?: number,
  maskPattern?: string,
  childProcess?: any
};

export type ContentStateType = {
  +activeView: string,
  left: ?ItemListStateType,
  right: ?ItemListStateType,
  fileAction?: ?FileActions,
  targetItem?: ?ItemStateType,
  actionState?: ?ActionState,
  isStart: boolean,
  isDone: boolean,
  isCanceled: boolean,
  needToConfirm: boolean,
  forced: boolean,
  overwriteIfNewer: boolean,
  overwriteIfNewerSubDirectory: ?boolean,
  destDir?: ?string,
  itemRemains: Array<ItemStateType>,
  dstFileName?: ?string,
  logMessage?: ?string,
  showSpinner?: ?boolean,
  enableCopyToFuse: boolean,
  childProcess?: any,
  viewMode: ViewType
};

export type ItemListStateType = {
  position: number,
  items: Array<ItemStateType>,
  path: string,
  sortType: SortType,
  infoType: number,
  histories: Array<HistoryStateType>,
  isInvalidPath: boolean,
  needToRefresh: boolean,
  maskPattern: string
};

export type ItemStateType = {
  fileName: string,
  fileBody: string,
  fileExt: string,
  stats: any,
  marked: boolean,
  isDirectory: boolean,
  isSymbolicLink: boolean
};

export type HistoryStateType = {
  path: string,
  lastPosition: number
};

export type PreferenceType = {
  terminalEmulator?: ?string,
  kbd101?: ?boolean,
  watchExcludes?: Array<string>,
  showPathOnTitleBar?: ?boolean,
  favoritePathList?: ?Array<string>,
  textFileRegexp?: ?string,
  textEditor?: ?string
};

export const SWITCH_ACTIVE_VIEW = 'SWITCH_ACTIVE_VIEW';
export const MOVE_CURSOR_UP = 'MOVE_CURSOR_UP';
export const MOVE_CURSOR_DOWN = 'MOVE_CURSOR_DOWN';
export const MOVE_CURSOR_TO = 'MOVE_CURSOR_TO';
export const RETRIEVE_FILE_LIST = 'RETRIEVE_FILE_LIST';
export const CHANGE_DIRECTORY = 'CHANGE_DIRECTORY';
export const CHANGE_SORT_TYPE = 'CHANGE_SORT_TYPE';
export const CHANGE_INFO_TYPE = 'CHANGE_INFO_TYPE';
export const MARK_ITEM = 'MARK_ITEM';
export const RANGE_MARK_ITEM = 'RANGE_MARK_ITEM';
export const MAY_COPY_ITEM = 'MAY_COPY_ITEM';
export const CANCEL_COPY_ITEM = 'CANCEL_COPY_ITEM';
export const COPYING_ITEM = 'COPYING_ITEM';
export const COPIED_ITEM = 'COPIED_ITEM';
export const SKIP_COPY_ITEM = 'SKIP_COPY_ITEM';
export const MAY_DELETE_ITEM = 'MAY_DELETE_ITEM';
export const CANCEL_DELETE_ITEM = 'CANCEL_DELETE_ITEM';
export const DELETING_ITEM = 'DELETING_ITEM';
export const DELETED_ITEM = 'DELETED_ITEM';
export const MAY_MOVE_ITEM = 'MAY_MOVE_ITEM';
export const CANCEL_MOVE_ITEM = 'CANCEL_MOVE_ITEM';
export const MOVING_ITEM = 'MOVING_ITEM';
export const MOVED_ITEM = 'MOVED_ITEM';
export const SKIP_MOVE_ITEM = 'SKIP_MOVE_ITEM';
export const CREATE_DIRECTORY = 'CREATE_DIRECTORY';
export const CANCEL_CREATE_DIRECTORY = 'CANCEL_CREATE_DIRECTORY';
export const MARK_ALL_FILES = 'MARK_ALL_FILES';
export const MARK_ALL_ITEMS = 'MARK_ALL_ITEMS';
export const RENAME_ITEM = 'RENAME_ITEM';
export const ADD_LOG_MESSAGE = 'ADD_LOG_MESSAGE';
export const REFRESH_DONE = 'REFRESH_DONE';
export const RESET_ACTION = 'RESET_ACTION';
export const SET_FILE_MASK = 'SET_FILE_MASK';
export const SWITCH_TO_TEXT_VIEW = 'SWITCH_TO_TEXT_VIEW';
export const SWITCH_TO_IMAGE_VIEW = 'SWITCH_TO_IMAGE_VIEW';
export const SWITCH_TO_DIRECTORY_VIEW = 'SWITCH_TO_DIRECTORY_VIEW';

export type SortType =
  | 'FileDescDirFirst'
  | 'FileAscDirFirst'
  | 'ExtDescDirFirst'
  | 'ExtAscDirFirst'
  | 'DateDescDirFirst'
  | 'DateAscDirFirst'
  | 'SizeAscDirFirst'
  | 'SizeDescDirFirst';

export type FileActions =
  | 'NONE'
  | 'COPY'
  | 'DELETE'
  | 'MOVE'
  | 'MKDIR'
  | 'RENAME'
  | 'LOGGING';

export type ActionState =
  | 'INIT'
  | 'START'
  | 'DOING'
  | 'DONE'
  | 'CANCELED'
  | 'ERROR'
  | 'SKIPPED';

export type FindItemType = 'PrefixMatch' | 'PartialMatch';

export const MAX_FILE_INFO_TYPE = 3;
// TODO 数値との相互変換が楽に出来るようになったら使う
export type FileInfoType = 'FileMode' | 'FileSize' | 'FileOwner';
export type CopyMoveType =
  | 'Overwrite'
  | 'OverwriteIfNewerSubDirectory'
  | 'OverwriteIfNewer'
  | 'ChangeFileName'
  | 'Cancel';

export type ViewType = 'DIRECTORY' | 'TEXT' | 'IMAGE';

export const DEFAULT_TEXT_FILE_PATTERN = '\\.(txt|json|md|ya?ml|xml)$';
