// @flow
import * as fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import os from 'os';
import { exec } from 'child_process';
import glob from 'glob';
import AdmZip from 'adm-zip';
import type {
  SortType,
  ActionType,
  ContentStateType,
  FindItemType,
  HistoryStateType,
  ItemStateType,
  PreferenceType,
  VirtualFolderEntryType,
  ItemListStateType
} from '../utils/types';
import {
  MAX_FILE_INFO_TYPE,
  SWITCH_ACTIVE_VIEW,
  MOVE_CURSOR_UP,
  MOVE_CURSOR_DOWN,
  MOVE_CURSOR_TO,
  RETRIEVE_FILE_LIST,
  CHANGE_DIRECTORY,
  CHANGE_SORT_TYPE,
  CHANGE_INFO_TYPE,
  // MARK_ITEM,
  RANGE_MARK_ITEM,
  MARK_ALL_ITEMS,
  MARK_ALL_FILES,
  ADD_LOG_MESSAGE,
  REFRESH_DONE,
  RESET_ACTION,
  SET_FILE_MASK,
  SWITCH_TO_TEXT_VIEW,
  SWITCH_TO_IMAGE_VIEW,
  SWITCH_TO_DIRECTORY_VIEW,
  CHANGE_VIRTUAL_FOLDER
} from '../utils/types';
import { extractBodyAndExt, convertPath, anotherSideView } from '../utils/file';
import {getActiveContent, regexFindIndex} from '../utils/util';
import getFindItemType from '../utils/preference';

export function switchActiveView() {
  return {
    type: SWITCH_ACTIVE_VIEW
  };
}

function moveCursorUpAction(viewPosition: string) {
  return {
    type: MOVE_CURSOR_UP,
    viewPosition
  };
}

export function moveCursorUp() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    if (activeContent.position > 0) {
      dispatch(moveCursorUpAction(activeView));
    }
  };
}

function moveCursorDownAction(viewPosition: string) {
  return {
    type: MOVE_CURSOR_DOWN,
    viewPosition
  };
}

export function moveCursorDown() {
  return (dispatch: Function, getState: Function) => {
    const { content }: { content: ContentStateType } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    if (activeContent.position < activeContent.items.length - 1) {
      dispatch(moveCursorDownAction(activeView));
    }
  };
}

export function moveCursorToTop() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content }: { content: ContentStateType } = getState();
    const { activeView } = getActiveContent(content);
    dispatch(moveCursorAction(activeView, 0));
  };
}

export function moveCursorToBottom() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content }: { content: ContentStateType } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    dispatch(
      moveCursorAction(activeView, activeContent.items.length - 1)
    );
  };
}
function moveCursorAction(viewPosition, currentPosition) {
  return {
    type: MOVE_CURSOR_TO,
    viewPosition,
    currentPosition
  };
}

export function moveCursorPageUp(viewPosition: string, rowCount: number) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const newPos = content[viewPosition].position - rowCount;
    dispatch(moveCursorAction(viewPosition, newPos < 0 ? 0 : newPos));
  };
}

export function moveCursorPageDown(viewPosition: string, rowCount: number) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const newPos = content[viewPosition].position + rowCount;
    const maxPos = content[viewPosition].items.length - 1;
    dispatch(moveCursorAction(viewPosition, newPos > maxPos ? maxPos : newPos));
  };
}

export function moveCursorToFilePrefix(viewPosition: string, prefix: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();

    const fileNames = content[viewPosition].items.map(item => item.fileName);
    const newPos = regexFindIndex(
      fileNames,
      new RegExp(`^${prefix}`, 'i'),
      content[viewPosition].position + 1
    );

    if (newPos >= 0) {
      dispatch(moveCursorAction(viewPosition, newPos));
    } else {
      // 見つからなければ先頭から再検索
      const newPos2 = regexFindIndex(
        fileNames,
        new RegExp(`^${prefix}`, 'i'),
        0
      );
      if (newPos2 >= 0) {
        dispatch(moveCursorAction(viewPosition, newPos2));
      }
    }
  };
}

export function retrieveFileList(
  viewPosition: string,
  items: Array<ItemStateType>,
  currentPosition: number,
  isInvalidPath: boolean = false
) {
  return {
    type: RETRIEVE_FILE_LIST,
    viewPosition,
    items,
    currentPosition,
    isInvalidPath
  };
}

export function refreshDone(viewPosition: string) {
  return {
    type: REFRESH_DONE,
    viewPosition
  };
}

function getOrderFunc(sort: SortType) {
  // '..' は必ず先頭に来るよう調整
  const defaultOrderFunc = (a, b) =>
    Number(b.fileName === '..') - Number(a.fileName === '..') ||
    Number(b.isDirectory) - Number(a.isDirectory) ||
    a.fileName.localeCompare(b.fileName);

  // 昇順／ディレクトリは上
  if (sort === 'FileAscDirFirst') {
    return defaultOrderFunc;
  }
  // 降順／ディレクトリは上
  else if (sort === 'FileDescDirFirst') {
    return (a, b) =>
      Number(b.fileName === '..') - Number(a.fileName === '..') ||
      Number(b.isDirectory) - Number(a.isDirectory) ||
      b.fileName.localeCompare(a.fileName);
  }

  // 拡張子昇順／ディレクトリは上
  else if (sort === 'ExtAscDirFirst') {
    return (a, b) =>
      Number(b.fileName === '..') - Number(a.fileName === '..') ||
      Number(b.isDirectory) - Number(a.isDirectory) ||
      a.fileExt.localeCompare(b.fileExt) ||
      a.fileBody.localeCompare(b.fileBody);
  }
  // 拡張子降順／ディレクトリは上
  else if (sort === 'ExtDescDirFirst') {
    return (a, b) =>
      Number(b.fileName === '..') - Number(a.fileName === '..') ||
      Number(b.isDirectory) - Number(a.isDirectory) ||
      b.fileExt.localeCompare(a.fileExt) ||
      b.fileBody.localeCompare(a.fileBody);
  }

  // 更新日時昇順／ディレクトリは上
  else if (sort === 'DateAscDirFirst') {
    return (a, b) => {
      if (a.stats == null || a.stats.mtimeMs == null) return 1;
      if (b.stats == null || b.stats.mtimeMs == null) return -1;
      const statsA = a.stats;
      const statsB = b.stats;
      return (
        Number(b.fileName === '..') - Number(a.fileName === '..') ||
        Number(b.isDirectory) - Number(a.isDirectory) ||
        statsA.mtimeMs - statsB.mtimeMs
      );
    };
  }
  // 更新日時降順／ディレクトリは上
  else if (sort === 'DateDescDirFirst') {
    return (a, b) => {
      if (a.stats == null || a.stats.mtimeMs == null) return 1;
      if (b.stats == null || b.stats.mtimeMs == null) return -1;
      const statsA = a.stats;
      const statsB = b.stats;
      return (
        Number(b.fileName === '..') - Number(a.fileName === '..') ||
        Number(b.isDirectory) - Number(a.isDirectory) ||
        statsB.mtimeMs - statsA.mtimeMs
      );
    };
  }
  // ファイルサイズ昇順／ディレクトリは上
  else if (sort === 'SizeAscDirFirst') {
    return (a, b) => {
      if (a.stats == null || a.stats.size == null) return 1;
      if (b.stats == null || b.stats.size == null) return -1;
      const statsA = a.stats;
      const statsB = b.stats;
      return (
        Number(b.fileName === '..') - Number(a.fileName === '..') ||
        Number(b.isDirectory) - Number(a.isDirectory) ||
        statsA.size - statsB.size
      );
    };
  }
  // ファイルサイズ降順／ディレクトリは上
  else if (sort === 'SizeDescDirFirst') {
    return (a, b) => {
      if (a.stats == null || a.stats.size == null) return 1;
      if (b.stats == null || b.stats.size == null) return -1;
      const statsA = a.stats;
      const statsB = b.stats;
      return (
        Number(b.fileName === '..') - Number(a.fileName === '..') ||
        Number(b.isDirectory) - Number(a.isDirectory) ||
        statsB.size - statsA.size
      );
    };
  }

  return defaultOrderFunc;
}

export function fetchItems(
  viewPosition: string,
  keepPosition: boolean = false,
  keepMarks: boolean = false
) {
  return (dispatch: Function, getState: Function) => {
    const { content } = getState();
    const targetContent = content[viewPosition];
    // console.log("fetchItems: viewPosition: ", viewPosition);
    // console.log("fetchItems: content: ", content);

    const targetDir = convertPath(targetContent.path);
    if (!targetDir) {
      // 親ディレクトリだけは移動できるように。親も無効な場合がある
      const items: Array<ItemStateType> = [
        {
          fileName: '..',
          fileBody: '..',
          fileExt: '',
          stats: null,
          marked: false,
          isDirectory: true,
          isSymbolicLink: false
        }
      ];
      dispatch(retrieveFileList(viewPosition, items, 0, true));
      return;
    }

    // const files = fs.readdirSync(targetDir);
    // TODO ディレクトリは無視してglobが動作するように
    // TODO 複数パターン対応
    const files = glob.sync(
      targetContent.maskPattern, {dot: true, cwd: targetDir}
    ).map(f => f.split('/').pop());
    // console.log('files', files);

    // ルートディレクトリでなければ上位ディレクトリを追加
    if (path.parse(targetDir).root !== targetDir) {
      files.unshift('..');
    }

    // oldItemsの同一ファイルが見つかった場合はそちらのmarkedを採用する
    const oldItems = targetContent.items;
    // console.log("oldItems:", oldItems);
    const getMarked = file => {
      // console.log("file:", file);
      // console.log("find:", oldItems.find((item) => item.fileName === file));
      const oldItem = oldItems.find(item => item.fileName === file);
      return oldItem ? oldItem.marked : false;
    };

    const items = files.map(file => {
      const { body, ext } = extractBodyAndExt(file);
      let stats = null;
      let lstats = null;
      const targetPath = path.join(targetDir, file);
      try {
        // Treating an asar Archive as a Normal File
        // https://electronjs.org/docs/tutorial/application-packaging#treating-an-asar-archive-as-a-normal-file
        // $FlowFixMe
        process.noAsar = true;
        stats = fs.statSync(targetPath);
        lstats = fs.lstatSync(targetPath);
        // 挙動を戻しておかないと Electron の各モジュールに影響が出る
        // $FlowFixMe
        process.noAsar = false;
      } catch (err) {
        console.error(err);
      }
      return {
        fileName: file,
        fileBody: body,
        fileExt: ext,
        stats,
        marked: !keepMarks ? false : getMarked(file),
        isDirectory: !!(stats && stats.isDirectory()),
        isSymbolicLink: !!(lstats && lstats.isSymbolicLink())
      };
    });

    // 様々なルールに従ったソート
    items.sort(getOrderFunc(targetContent.sortType));

    // カーソル位置の計算
    let currentPosition = 0;
    if (keepPosition) {
      currentPosition =
        targetContent.position > items.length - 1
          ? items.length - 1
          : targetContent.position;
    }

    dispatch(retrieveFileList(viewPosition, items, currentPosition, false));
  };
}

export function changeDirectoryAction(
  viewPosition: string,
  target: string,
  targetPosition: number,
  currentPath: ?string,
  currentPosition: number
) {
  return {
    type: CHANGE_DIRECTORY,
    viewPosition,
    path: path.resolve(target),
    cursorPosition: targetPosition,
    currentPath,
    currentPosition
  };
}

export function changeDirectory(
  viewPosition: string,
  targetPath: string,
  targetPosition: number,
  currentPath: ?string,
  currentPosition: number = 0
) {
  return (dispatch: (action: ActionType) => void) => {
    fs.accessSync(targetPath, fs.constants.R_OK);
    dispatch(
      changeDirectoryAction(
        viewPosition,
        targetPath,
        targetPosition,
        currentPath,
        currentPosition
      )
    );
  };
}

export function addLogMessage(logMessage: string) {
  return {
    type: ADD_LOG_MESSAGE,
    logMessage
  };
}

export function changeDirectoryAndFetch(
  targetPath: string,
  targetPosition: number,
  dispatch: Function,
  viewPosition: string,
  currentPath: ?string,
  currentPosition: number = 0
) {
  try {
    dispatch(
      changeDirectory(
        viewPosition,
        targetPath,
        targetPosition,
        currentPath,
        currentPosition
      )
    );
  } catch (err) {
    console.error(err);
    dispatch(addLogMessage(`Can't change directory: ${targetPath}`));
    return;
  }

  try {
    dispatch(fetchItems(viewPosition, true, false));
  } catch (err) {
    // ディレクトリ移動成功したが一覧取得失敗時、元ディレクトリに戻す
    console.error(err);
    dispatch(
      changeDirectory(
        viewPosition,
        currentPath,
        currentPosition,
        currentPath,
        currentPosition
      )
    );
    dispatch(fetchItems(viewPosition, true, false));
    dispatch(addLogMessage(`Can't change directory: ${targetPath}`));
  }
}

function changeVirtualFolderAndFetch(
  activeContent,
  cursorPosition,
  dispatch,
  viewPosition,
  moveToParent = false
) {
  console.log('activeContent:', activeContent);
  const currentPath = activeContent.virtualPath;
  console.log('currentPath:', currentPath);
  const currentVFEntry = activeContent.virtualFolderEntry;
  console.log('currentVFEntry:', currentVFEntry);

  const item = activeContent.items[cursorPosition];
  console.log('item:', item);
  let targetPath;
  let targetVFEntry: ?VirtualFolderEntryType;
  if (moveToParent || item.fileName === '..') {
    if (currentVFEntry == null) {
      // 仮想フォルダモードを抜ける
      changeDirectoryAndFetch(
        activeContent.path,
        0,
        dispatch,
        viewPosition,
        null,
        0
      );
      return;
    }
    targetPath = currentVFEntry.parent;
    console.log("target path:", targetPath);
    if (targetPath === '') {
      targetVFEntry = null;
    } else {
      const pathParts = targetPath.split('/');
      const parent = pathParts.slice(0, -1).join('/');
      const entry = pathParts.slice(-1)[0];
      console.log('parent:', parent);
      console.log('entry:', entry);
      targetVFEntry = activeContent.virtualFolderEntries
        .find(x => x.parent === parent && x.entry === entry);
    }
  } else {
    if (currentVFEntry == null) {
      targetPath = item.fileName;
    } else {
      targetPath = `${currentPath}/${item.fileName}`;
    }
    console.log("target path:", targetPath);
    targetVFEntry = activeContent.virtualFolderEntries
      .find(x => x.parent === currentPath && x.entry === item.fileName);
  }
  console.log("targetVFEntry:", targetVFEntry);

  // ディレクトリならディレクトリ内のリストを取得
  if (targetVFEntry == null || targetVFEntry.isDirectory) {
    const items: Array<ItemStateType> = [];

    // ルートディレクトリでなければ親へのエントリを追加
    if (targetPath !== '') {
      items.push({
        fileName: '..',
        fileBody: '..',
        fileExt: '',
        stats: null,
        marked: false,
        isDirectory: true,
        isSymbolicLink: false
      });
    }

    activeContent.virtualFolderEntries.forEach(x => {
      if (x.parent === targetPath) {
        items.push({
          fileName: x.entry,
          fileBody: x.entry,
          fileExt: '',
          stats: {
            vf: {
              fileDate: x.zipEntry.header.time,
              fileSize: x.zipEntry.header.size,
            },
          },
          marked: false,
          isDirectory: x.isDirectory,
          isSymbolicLink: false,
        });
      }
    });

    dispatch(
      changeVirtualFolder(
        activeContent.virtualFolderTarget,
        activeContent.virtualFolderEntries,
        viewPosition,
        targetPath,
        0,
        targetVFEntry
      )
    );
    dispatch(retrieveFileList(viewPosition, items, 0, false));
  }
}

export function execEnter(
  viewPosition: string,
  cursorPosition: number,
  withCtrl: boolean = false,
  parentAsCurrent: boolean = false,
  preferences: PreferenceType
) {
  return (dispatch: Function, getState: Function) => {
    const { content } = getState();
    const activeContent: ItemListStateType = content[viewPosition];

    // 仮想フォルダモード
    if (activeContent.isVirtualFolder) {
      changeVirtualFolderAndFetch(
        activeContent,
        cursorPosition,
        dispatch,
        viewPosition,
        false
      );
      return;
    }

    const item = activeContent.items[cursorPosition];
    const currentPath =
      convertPath(activeContent.path) || activeContent.path;
    // parentAsCurrent が有効なら .. はカレントディレクトリとして扱う
    const targetPath = path.join(
      currentPath,
      parentAsCurrent && item.fileName === '..' ? '' : item.fileName
    );

    // console.log("target path=", targetPath);
    // console.log("cursorPosition=", cursorPosition);

    const { stats } = item;

    // 無効なディレクトリの場合は何もしない
    // 元々ディレクトリ操作だけは出来るようにしていたが、statsが取れない場合は
    // ファイルなのかディレクトリなのかが区別つかない
    if (!stats) return;

    if (withCtrl) {
      shell.openItem(targetPath);
      dispatch(moveCursorDown());
      return;
    }

    if (item.isDirectory) {
      changeDirectoryAndFetch(
        targetPath,
        0,
        dispatch,
        viewPosition,
        currentPath,
        cursorPosition
      );
      return;
    }

    // 内部ビューア処理

    // ファイルがテキストと判断されるものであれば、内部テキストビューアを起動
    const {textFileRegexp} = preferences;
    // console.log('textFileRegexp', textFileRegexp);
    if (textFileRegexp) {
      // $FlowFixMe
      const regexp = new RegExp(String.raw`${textFileRegexp}`, 'i');
      // console.log('regexp', regexp);
      if (regexp.test(item.fileName)) { // eslint-disable-line no-lonely-if
        console.log('assumed to text file:', targetPath);
        dispatch(switchToTextViewAction(item));
        dispatch(moveCursorDown());
        return;
      }
    }

    // 画像ビューア
    if (/\.(jpe?g|png)$/i.test(item.fileName)) {
      console.log('assumed to image file:', targetPath);
      dispatch(switchToImageViewAction(item));
      dispatch(moveCursorDown());
      return;
    }

    // 仮想フォルダ
    if (/\.zip$/i.test(item.fileName)) {
      console.log('assumed to archive file:', targetPath);
      try {
        const zip = new AdmZip(targetPath);
        const items: Array<ItemStateType> = [];
        const vfEntries: Array<VirtualFolderEntryType> = [];
        zip.getEntries().forEach((zipEntry) => {
          // console.log('zipEntry.toString()', zipEntry.toString());
          console.log('zipEntry.header', zipEntry.header);
          const pathParts = zipEntry.entryName.split('/');
          let parent = '';
          let entry;
          const {isDirectory} = zipEntry;
          if (isDirectory) {
            if (pathParts.length > 2) {
              parent = pathParts.slice(0, pathParts.length - 2).join('/');
            }
            entry = pathParts[pathParts.length - 2];
          } else {
            if (pathParts.length > 1) {
              parent = pathParts.slice(0, pathParts.length - 1).join('/');
            }
            entry = pathParts[pathParts.length - 1];
          }
          const vfEntry: VirtualFolderEntryType = {
            parent,
            entry,
            isDirectory,
            zipEntry
          };
          console.log(vfEntry);
          vfEntries.push(vfEntry);

          // 初期表示用
          if (vfEntry.parent === '') {
            items.push({
              fileName: vfEntry.entry,
              fileBody: vfEntry.entry,
              fileExt: '',
              stats: {
                vf: {
                  fileDate: zipEntry.header.time,
                  fileSize: zipEntry.header.size,
                },
              },
              marked: false,
              isDirectory: vfEntry.isDirectory,
              isSymbolicLink: false,
            });
          }
        });
        // TODO 仮想フォルダ内パス表示
        // TODO 仮想フォルダ構造をオブジェクト化して content に持たせる
        dispatch(
          changeVirtualFolder(
            item,
            vfEntries,
            viewPosition,
            '',
            0,
            null
          )
        );
        dispatch(retrieveFileList(viewPosition, items, 0, false));
      } catch (e) {
        console.error(e);
        dispatch(addLogMessage(`Can't extract archive file: ${targetPath}`));
      }
      return;
    }

    console.log('[NO IMPLEMENT] open internal viewer:', targetPath);
  };
}

export function changeVirtualFolderAction(
  virtualFolderTarget: ItemStateType,
  virtualFolderEntries: Array<VirtualFolderEntryType>,
  viewPosition: string,
  target: string,
  targetPosition: number,
  virtualFolderEntry: ?VirtualFolderEntryType
) {
  return {
    type: CHANGE_VIRTUAL_FOLDER,
    virtualFolderTarget,
    virtualFolderEntries,
    viewPosition,
    path: target,
    cursorPosition: targetPosition,
    virtualFolderEntry
  };
}

export function changeVirtualFolder(
  virtualFolderTarget: ItemStateType,
  virtualFolderEntries: Array<VirtualFolderEntryType>,
  viewPosition: string,
  targetPath: string,
  targetPosition: number,
  virtualFolderEntry: ?VirtualFolderEntryType
) {
  return (dispatch: (action: ActionType) => void) => {
    dispatch(
      changeVirtualFolderAction(
        virtualFolderTarget,
        virtualFolderEntries,
        viewPosition,
        targetPath,
        targetPosition,
        virtualFolderEntry
      )
    );
  };
}

export function switchToInternalView() {
  return (dispatch: Function, getState: Function) => {
    const { content } = getState();
    const { activeContent } = getActiveContent(content);
    const item: ItemStateType = activeContent.items[activeContent.position];
    if (item.isDirectory) return;

    // TODO ファイルの中身を判定した上でビューアを切り替える必要がある
    dispatch(switchToTextViewAction(item));
  };
}

function switchToTextViewAction(targetItem: ItemStateType) {
  return {
    type: SWITCH_TO_TEXT_VIEW,
    targetItem
  };
}

function switchToImageViewAction(targetItem: ItemStateType) {
  return {
    type: SWITCH_TO_IMAGE_VIEW,
    targetItem
  };
}

export function switchToDirectoryView() {
  return (dispatch: Function) => {
    dispatch(switchToDirectoryViewAction());
  };
}

function switchToDirectoryViewAction() {
  return {
    type: SWITCH_TO_DIRECTORY_VIEW
  };
}
export function changeDirectoryToParent() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);

    if (activeContent.isVirtualFolder) {
      changeVirtualFolderAndFetch(
        activeContent,
        activeContent.position,
        dispatch,
        activeView,
        true
      );
      return;
    }

    const currentPath =
      convertPath(activeContent.path) || activeContent.path;
    const targetPath = path.join(currentPath, '..');
    // 履歴から探して見つかれば、そこのlastPositionをセット
    const entry: ?HistoryStateType = activeContent.histories.find(
      history => history.path === targetPath
    );
    changeDirectoryAndFetch(
      targetPath,
      entry ? entry.lastPosition : 0,
      dispatch,
      activeView,
      currentPath,
      activeContent.position
    );
  };
}

export function changeDirectoryToHome() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    const currentPath =
      convertPath(activeContent.path) || activeContent.path;
    const targetPath = os.homedir();
    changeDirectoryAndFetch(
      targetPath,
      0,
      dispatch,
      activeView,
      currentPath,
      activeContent.position
    );
  };
}

export function changeDirectoryToRoot() {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    const currentPath =
      convertPath(activeContent.path) || activeContent.path;
    try {
      const { root } = path.parse(currentPath);
      changeDirectoryAndFetch(
        root,
        0,
        dispatch,
        activeView,
        currentPath,
        activeContent.position
      );
    } catch (err) {
      console.error(err);
    }
  };
}

export function changeActiveView(targetView: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView } = getActiveContent(content);
    if (targetView !== activeView) {
      dispatch(switchActiveView());
    }
  };
}

export function changeSortType(viewPosition: string, sortType: SortType) {
  return {
    type: CHANGE_SORT_TYPE,
    viewPosition,
    sortType
  };
}

export function changeSortTypeAction(viewPosition: string, sort: SortType) {
  return (dispatch: Function) => {
    dispatch(changeSortType(viewPosition, sort));
    dispatch(fetchItems(viewPosition, true, true));
  };
}

export function changeInfoType(
  viewPosition: string,
  infoType: number,
  direction: string
) {
  // console.log('changeInfoType', direction);
  let newInfoType;
  if (direction === 'next') {
    newInfoType = infoType === MAX_FILE_INFO_TYPE ? 1 : infoType + 1;
  } else if (direction === 'prev') {
    newInfoType = infoType === 1 ? MAX_FILE_INFO_TYPE : infoType - 1;
  }

  return {
    type: CHANGE_INFO_TYPE,
    viewPosition,
    infoType: newInfoType
  };
}

export function changeDirectoryToAnother(viewPosition: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    changeDirectoryAndFetch(
      content[anotherSideView(viewPosition)].path,
      0,
      dispatch,
      viewPosition,
      content[viewPosition].path
    );
  };
}

export function changeAnotherViewDirectory(viewPosition: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    changeDirectoryAndFetch(
      content[viewPosition].path,
      0,
      dispatch,
      anotherSideView(viewPosition),
      content[anotherSideView(viewPosition)].path
    );
  };
}

export function changeDirectoryTo(
  viewPosition: string,
  directory: string,
  position: number = 0
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const currentDir = content[viewPosition].path;
    // 相対ディレクトリ対応
    const targetPath = convertPath(directory, currentDir);
    if (targetPath) {
      changeDirectoryAndFetch(
        targetPath,
        position,
        dispatch,
        viewPosition,
        content[viewPosition].path,
        content[viewPosition].position
      );
    }
  };
}

function markItem(viewPosition, row, mark) {
  return {
    // type: MARK_ITEM,
    // TODO こうしないと 'Uncaught TypeError: Assignment to constant variable.' が発生する
    type: 'MARK_ITEM',
    viewPosition,
    row,
    mark
  };
}

export function markOrUnmarkItem() {
  return (dispatch: Function, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    const cursorPosition = activeContent.position;
    const item = activeContent.items[cursorPosition];

    // .. にはマークを付けない。それ以外はマークの反転
    const mark = item.fileName === '..' ? false : !item.marked;
    dispatch(markItem(activeView, cursorPosition, mark));
    dispatch(moveCursorDown());
  };
}

function rangeMarkItemAction(
  viewPosition: string,
  items: Array<ItemStateType>
) {
  return {
    type: RANGE_MARK_ITEM,
    viewPosition,
    items
  };
}

// カーソル位置より上（もしくは下）にある最も近いマーク位置からカーソル位置までの一括マーク機能
// 上（もしくは下）にマークされたアイテムがなければ何もしない
// カーソル位置がマーク済の場合は何もしない
export function rangeMarkItem(
  towardAbove: boolean = false
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    const cursorPosition = activeContent.position;
    const current = activeContent.items[cursorPosition];
    if (current.marked) {
      return;
    }

    // console.log('isAbove:', isAbove);
    if (towardAbove) {
      // カーソルの上にある最も近いマークを探す
      let nearestIndex = -1;
      activeContent.items
        .slice(0, cursorPosition)
        .forEach((item, index) => {
          if (item.marked) {
            nearestIndex = index;
          }
        });
      // console.log('nearestIndex:', nearestIndex);
      if (nearestIndex < 0) {
        return;
      }

      for (let i = nearestIndex + 1; i <= cursorPosition; i += 1) {
        activeContent.items[i].marked = true;
      }
    } else {
      // カーソルの下にある最も近いマークを探す
      const nearestIndex =
        activeContent.items
          .slice(cursorPosition + 1)
          .findIndex(item => item.marked) +
        cursorPosition +
        1;
      // console.log('nearestIndex:', nearestIndex);
      if (nearestIndex < 0) {
        return;
      }

      for (let i = cursorPosition; i < nearestIndex; i += 1) {
        activeContent.items[i].marked = true;
      }
    }

    dispatch(rangeMarkItemAction(activeView, activeContent.items));
  };
}

function markAllItemsAction(viewPosition: string, items: Array<ItemStateType>) {
  return {
    type: MARK_ALL_ITEMS,
    viewPosition,
    items
  };
}

export function markAllItems(viewPosition: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const items = content[viewPosition].items.map(item => ({
      ...item,
      marked: item.fileName !== '..' && !item.marked
    }));

    dispatch(markAllItemsAction(viewPosition, items));
  };
}

function markAllFilesAction(viewPosition: string, items: Array<ItemStateType>) {
  return {
    type: MARK_ALL_FILES,
    viewPosition,
    items
  };
}

export function markAllFiles(viewPosition: string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const getMarked = item => {
      if (item.fileName === '..') {
        return false;
      } else if (item.isDirectory) {
        // マーク済のディレクトリは動かさない
        return item.marked;
      }
      return !item.marked;
    };
    const items = content[viewPosition].items.map(item => ({
      ...item,
      marked: getMarked(item)
    }));

    dispatch(markAllFilesAction(viewPosition, items));
  };
}

// searchNextがtrueの場合、カーソル位置の直後から探す(Enterキーを想定)
export function findItem(
  viewPosition: string,
  findText: string,
  searchNext: boolean
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const currentPosition = content[viewPosition].position;
    const correction = searchNext ? 1 : 0;
    const isMatch = item => {
      const findItemType: FindItemType = getFindItemType();
      if (findItemType === 'PrefixMatch') {
        return item.fileName.startsWith(findText);
      }
      const re = new RegExp(`${escapeRegExp(findText)}`, 'i');
      return re.test(item.fileName);
    };
    const index = content[viewPosition].items
      .slice(currentPosition + correction)
      .findIndex(item => isMatch(item));

    if (index >= 0) {
      dispatch(
        moveCursorAction(viewPosition, index + currentPosition + correction)
      );
    } else {
      // 見つからなければ先頭から再検索
      const index2 = content[viewPosition].items.findIndex(item =>
        isMatch(item)
      );
      if (index2 >= 0) {
        dispatch(moveCursorAction(viewPosition, index2));
      }
    }
  };
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function reset() {
  return {
    type: RESET_ACTION
  };
}

export function launchTerminal(
  viewPosition: string,
  cursorPosition: number,
  commandLine?: string
) {
  return (dispatch: Function, getState: Function) => {
    if (!commandLine) return;

    const { content } = getState();
    const item = content[viewPosition].items[cursorPosition];
    const currentPath =
      convertPath(content[viewPosition].path) || content[viewPosition].path;
    // .. はカレントディレクトリとして扱う
    const targetPath = path.join(
      currentPath,
      item.fileName === '..' ? '' : item.fileName
    );

    // console.log("target path=", targetPath);
    // console.log("cursorPosition=", cursorPosition);

    const { stats } = item;

    // 無効なディレクトリの場合は何もしない
    // 元々ディレクトリ操作だけは出来るようにしていたが、statsが取れない場合は
    // ファイルなのかディレクトリなのかが区別つかない
    if (!stats) return;

    if (item.isDirectory) {
      // $P -> 対象のフルパス
      // TODO 他の変数にも対応
      // TODO 汎用的なロジックに
      try {
        exec(commandLine.replace('$P', targetPath), { cwd: targetPath });
        dispatch(moveCursorDown());
      } catch (err) {
        console.log(err);
        dispatch(addLogMessage(`Can't launch terminal: ${commandLine} : ${targetPath}`));
      }
    }
  };
}

export function execCommand(viewPosition: string, commandLine: string) {
  return (dispatch: Function, getState: Function) => {
    const { content } = getState();
    const currentDir =
      convertPath(content[viewPosition].path) || content[viewPosition].path;

    exec(commandLine, { cwd: currentDir });
    dispatch(moveCursorDown());
  };
}

export function setFileMask(viewPosition: string, maskPattern: string) {
  return {
    type: SET_FILE_MASK,
    viewPosition,
    maskPattern
  };
}

export function launchTextEditor(
  commandLine?: string
) {
  return (dispatch: Function, getState: Function) => {
    if (!commandLine) return;
    // console.log("commandLine=", commandLine);

    const { content } = getState();
    const { activeContent } = getActiveContent(content);
    const item = activeContent.items[activeContent.position];
    const currentDir = convertPath(activeContent.path) || activeContent.path;
    const targetPath = path.join(currentDir, item.fileName);

    // console.log("target path=", targetPath);
    // console.log("cursorPosition=", cursorPosition);

    const { stats } = item;
    if (!stats) return;

    if (!item.isDirectory) {
      // $P -> 対象のフルパス
      // TODO 他の変数にも対応
      // TODO 汎用的なロジックに
      try {
        exec(commandLine.replace('$P', targetPath), { cwd: currentDir });
      } catch (err) {
        console.log(err);
        dispatch(addLogMessage(`Can't launch text editor: ${commandLine} : ${targetPath}`));
      }
    }
  };
}
