// @flow
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import fs from 'fs';
import { ipcRenderer, clipboard, remote } from 'electron';
import path from 'path';

import styles from './Home.scss';
import LogView from '../../components/LogView';
import StatusBar from '../../components/StatusBar';
import TextView from '../../components/TextView';
import {
  switchActiveView,
  moveCursorUp,
  moveCursorDown,
  moveCursorPageUp,
  moveCursorPageDown,
  moveCursorToTop,
  moveCursorToBottom,
  moveCursorToFilePrefix,
  execEnter,
  changeDirectoryToParent,
  changeDirectoryToHome,
  changeDirectoryToRoot,
  changeActiveView,
  changeInfoType,
  markOrUnmarkItem,
  rangeMarkItem,
  copyItems,
  mayCopy,
  cancelCopy,
  deleteItems,
  mayDelete,
  cancelDelete,
  moveItems,
  mayMove,
  cancelMove,
  fetchItems,
  changeSortTypeAction,
  createDirectory,
  changeDirectoryToAnother,
  changeAnotherViewDirectory,
  changeDirectoryTo,
  markAllFiles,
  markAllItems,
  findItem,
  mayRename,
  refreshDone,
  reset,
  launchTerminal,
  execCommand,
  setFileMask,
  switchToDirectoryView,
  switchToInternalView
} from '../../actions';
import type {
  SortType,
  ContentStateType,
  HistoryStateType,
  ItemStateType,
  PreferenceType,
  CopyMoveType
} from '../../utils/types';
import ChangeSortTypeDialog from '../../components/dialogs/ChangeSortTypeDialog';
import GenericDialog from '../../components/dialogs/GenericDialog';
import Content from '../../components/Content';
import CreateDirectoryDialog from '../../components/dialogs/CreateDirectoryDialog';
import ChangeDirectoryDialog from '../../components/dialogs/ChangeDirectoryDialog';
import SelectFavoriteDialog from '../../components/dialogs/SelectFavoriteDialog';
import ChangeDirectoryFromHistoryDialog from '../../components/dialogs/ChangeDirectoryFromHistoryDialog';
import RenameDialog from '../../components/dialogs/RenameDialog';
import CopyMoveDialog from '../../components/dialogs/CopyMoveDialog';
import PreferenceDialog from '../../components/dialogs/PreferenceDialog';
import ExecCommandDialog from '../../components/dialogs/ExecCommandDialog';
import FileMaskDialog from '../../components/dialogs/FileMaskDialog';
import Spinner from '../../components/Spinner';
import {
  getApplicationString,
  getShortApplicationString
} from '../../utils/system';
import { anotherSideView } from '../../utils/file';
import {
  doCopy,
  doDelete,
  doMove,
  doCreateDirectory,
  doRename,
  doLogging,
  doRefresh
} from './fileActions';
import {
  getTargetItem,
  savePreferences,
  setupPreferences,
  estimateRowCount,
  createMoveCursorToFilePrefixComboList,
  convertComboKey
} from './util';
import { getActiveContent, getMaskInfo } from '../../utils/util';

const Mousetrap = require('mousetrap-pause')(require('mousetrap'));

const { app } = remote;

type Props = {
  content: ContentStateType,
  switchActiveView: () => void,
  moveCursorUp: string => void,
  moveCursorDown: string => void,
  moveCursorPageUp: (string, number) => void,
  moveCursorPageDown: (string, number) => void,
  moveCursorToTop: string => void,
  moveCursorToBottom: string => void,
  moveCursorToFilePrefix: (viewPosition: string, prefix: string) => void,
  execEnter: (
    viewPosition: string,
    cursorPosition: number,
    withCtrl: boolean,
    parentAsCurrent: boolean,
    preferences: PreferenceType
  ) => void,
  changeDirectoryToParent: string => void,
  changeDirectoryToHome: string => void,
  changeDirectoryToRoot: string => void,
  changeActiveView: (targetView: string, activeView: string) => void,
  changeInfoType: (
    viewPosition: string,
    infoType: number,
    direction: string
  ) => void,
  markOrUnmarkItem: (viewPosition: string, cursorPosition: number) => void,
  rangeMarkItem: (
    viewPosition: string,
    cursorPosition: number,
    towardAbove: boolean
  ) => void,
  copyItems: (
    forced: boolean,
    overwriteIfNewer: boolean,
    newFileName: ?string,
    OverwriteIfNewerSubDirectory: ?boolean,
    destDir: ?string
  ) => void,
  mayCopy: (
    activeView: string,
    itemRemains: ?Array<ItemStateType>,
    forced: boolean,
    overwriteIfNewer: boolean,
    enableCopyToFuse: boolean,
    OverwriteIfNewerSubDirectory: ?boolean,
    targetPath?: ?string
  ) => void,
  cancelCopy: boolean => void,
  fetchItems: (
    viewPosition: string,
    keepPosition?: boolean,
    keepMarks?: boolean
  ) => void,
  deleteItems: (forced: boolean) => void,
  mayDelete: (
    viewPosition: string,
    remains: ?Array<ItemStateType>,
    forced: boolean
  ) => void,
  cancelDelete: boolean => void,
  moveItems: (
    forced: boolean,
    ifNewer: boolean,
    newFileName: ?string,
    destDir: ?string
  ) => void,
  mayMove: (
    viewPosition: string,
    remains: ?Array<ItemStateType>,
    forced: boolean,
    ifNewer: boolean,
    targetPath?: ?string
  ) => void,
  cancelMove: boolean => void,
  createDirectory: (viewPosition: string, directory: ?string) => void,
  changeDirectoryTo: (
    viewPosition: string,
    directory: string,
    position: ?number
  ) => void,
  changeDirectoryToAnother: string => void,
  changeAnotherViewDirectory: string => void,
  markAllFiles: string => void,
  markAllItems: string => void,
  changeSortTypeAction: (viewPosition: string, sort: SortType) => void,
  findItem: (
    viewPosition: string,
    findText: string,
    searchNext: boolean
  ) => void,
  mayRename: (
    viewPosition: string,
    targetItem: ItemStateType,
    dstFileName: ?string,
    mode: any,
    owner: ?string,
    group: ?string,
    atime: any,
    mtime: any
  ) => void,
  refreshDone: (viewPosition: string) => void, // eslint-disable-line react/no-unused-prop-types
  reset: () => void, // eslint-disable-line react/no-unused-prop-types
  launchTerminal: (
    viewPosition: string,
    cursorPosition: number,
    commandLine: ?string
  ) => void,
  execCommand: (viewPosition: string, commandLine: string) => void,
  setFileMask: (viewPosition: string, pattern: string) => void,
  switchToDirectoryView: () => void,
  switchToInternalView: () => void
};

type State = {
  watcher: {
    left: {
      handler: any,
      path: ?string
    },
    right: {
      handler: any,
      path: ?string
    }
  },
  preferences: PreferenceType
};

class Home extends Component<Props, State> {
  props: Props;

  contentLeft: any;
  contentRight: any;
  logView: any;
  spinner: any;
  statusBar: any;
  createDirectoryDialog: any;
  changeDirectoryDialog: any;
  changeDirectoryFromFavoritesDialog: any;
  copyToFavoriteDialog: any;
  moveToFavoriteDialog: any;
  changeDirectoryFromHistoryDialog: any;
  changeSortTypeDialog: any;
  renameDialog: any;
  preferenceDialog: any;
  execCommandDialog: any;
  deleteDialog: any;
  copyDialog: any;
  moveDialog: any;
  fileMaskDialog: any;

  constructor() {
    super();

    // クローズボタン押下時に設定保存して終了する
    ipcRenderer.on('app-close', () => {
      console.log('app-close');
      savePreferences(this.props.content, this.state.preferences);
      ipcRenderer.send('closed');
    });
  }

  state = {
    watcher: {
      left: {
        handler: null,
        path: ''
      },
      right: {
        handler: null,
        path: ''
      }
    },
    preferences: setupPreferences(),
  };

  componentDidMount() {
    Mousetrap.bind('tab', this.switchActiveView);
    Mousetrap.bind('up', this.moveCursorUp);
    Mousetrap.bind('down', this.moveCursorDown);
    Mousetrap.bind('pageup', this.moveCursorPageUp);
    Mousetrap.bind('mod+up', this.moveCursorPageUp);
    Mousetrap.bind('mod+pageup', this.moveCursorToTop);
    Mousetrap.bind('pagedown', this.moveCursorPageDown);
    Mousetrap.bind('mod+down', this.moveCursorPageDown);
    Mousetrap.bind('mod+pagedown', this.moveCursorToBottom);
    Mousetrap.bind('enter', this.execKeyAction);
    Mousetrap.bind('mod+enter', this.execKeyAction);
    Mousetrap.bind('backspace', this.changeDirectoryToParent);
    Mousetrap.bind('left', this.execLeftAction);
    Mousetrap.bind('right', this.execRightAction);
    Mousetrap.bind('\\', this.changeDirectoryToRoot);
    Mousetrap.bind('mod+\\', this.changeDirectoryToHome);
    Mousetrap.bind('end', this.reloadAllItems);
    Mousetrap.bind('mod+end', this.reloadAllItems);
    Mousetrap.bind('shift+end', this.reloadAllItems);
    Mousetrap.bind('shift+mod+end', this.reloadAllItems);
    Mousetrap.bind('mod+shift+enter', this.execKeyAction);

    Mousetrap.bind('1', this.changeInfoType);
    Mousetrap.bind('space', this.markOrUnmarkItem);
    Mousetrap.bind('mod+space', this.rangeMarkItem);
    Mousetrap.bind('shift+mod+space', this.rangeMarkItem);
    Mousetrap.bind('c', this.copyItems);
    Mousetrap.bind('C', this.openCopyToFavoriteDialog);
    Mousetrap.bind('k', this.deleteItems);
    Mousetrap.bind('m', this.execKeyAction);
    Mousetrap.bind('M', this.execKeyAction);
    Mousetrap.bind('o', this.changeDirectoryToAnother);
    Mousetrap.bind('O', this.changeAnotherViewDirectory);
    Mousetrap.bind('v', this.switchToInternalView);

    Mousetrap.bind('a', this.markAllFiles);
    Mousetrap.bind('home', this.markAllFiles);
    Mousetrap.bind('A', this.markAllItems);
    Mousetrap.bind('shift+home', this.markAllItems);

    Mousetrap.bind('s', this.openChangeSortTypeDialog);
    Mousetrap.bind('j', this.openChangeDirectoryFromFavoritesDialog);
    Mousetrap.bind('J', this.openChangeDirectoryDialog);
    Mousetrap.bind('h', this.openChangeDirectoryFromHistoryDialog);
    Mousetrap.bind('f', this.launchFindMode);
    Mousetrap.bind('r', this.openRenameDialog);
    Mousetrap.bind('z', this.openPreferenceDialog);
    Mousetrap.bind('x', this.openExecCommandDialog);
    Mousetrap.bind('X', this.openExecCommandDialog);
    Mousetrap.bind(':', this.openFileMaskDialog);

    // Ctrl+アルファベット、数値
    // TODO Ctrl+rについて、dev環境ではreloadが走ってしまうがproductionでは問題ない
    Mousetrap.bind(
      createMoveCursorToFilePrefixComboList(this.state.preferences.kbd101),
      this.execKeyAction
    );

    Mousetrap.bind('q', this.quitApplication);
    Mousetrap.bind('Q', this.quitApplication);

    // 101キーモードかどうかでキーバインドが変わるもの
    if (this.state.preferences.kbd101) {
      Mousetrap.bind('alt+/', this.copyPathToClipboard);
      Mousetrap.bind(']', this.showApplicationInfo);
    } else {
      // TODO ￥と＼の区別がついていない
      Mousetrap.bind('alt+\\', this.copyPathToClipboard);
      // TODO キーコンビネーションが動作しない
      Mousetrap.bind('alt+_', this.copyPathToClipboard);
      Mousetrap.bind('/', this.showApplicationInfo);
    }

    this.watchDirectory('left');
    this.watchDirectory('right');

    this.showApplicationInfo();

    this.showReady();

    // XXX for test
    // this.spinner.show();
    // console.log(settings.get('electronTTF.preferences'));
  }

  componentDidUpdate(prevProps: Props) {
    // console.log('prevProps:', prevProps.content);
    // console.log('this.props:', this.props.content);

    switch (this.props.content.fileAction) {
      case 'COPY':
        doCopy(prevProps, this.props, this);
        break;
      case 'DELETE':
        doDelete(prevProps, this.props, this);
        break;
      case 'MOVE':
        doMove(prevProps, this.props, this);
        break;
      case 'MKDIR':
        doCreateDirectory(prevProps, this.props, this);
        break;
      case 'RENAME':
        doRename(prevProps, this.props, this);
        break;
      case 'LOGGING':
        doLogging(prevProps, this.props, this);
        break;
      default:
    }

    if (this.props.content.left && this.props.content.left.needToRefresh) {
      doRefresh(prevProps, this.props, this, 'left');
      this.watchDirectory('left');
    }
    if (this.props.content.right && this.props.content.right.needToRefresh) {
      doRefresh(prevProps, this.props, this, 'right');
      this.watchDirectory('right');
    }

    this.setTitle(this.props);
  }

  setTitle = props => {
    const { activeContent } = getActiveContent(props.content);
    const win = remote.getCurrentWindow();
    const maskInfo = getMaskInfo(props.content.activeView, props.content);
    const pathInfo = `${activeContent.path}${maskInfo}`;
    if (this.state.preferences.showPathOnTitleBar) {
      win.setTitle(`${pathInfo} : ${getShortApplicationString()}`);
    } else {
      win.setTitle(getShortApplicationString());
    }
  };

  watchDirectory = viewPosition => {
    // console.log('watchDirectory', viewPosition);
    const { content } = this.props;
    const { watcher, preferences } = this.state;
    // console.log('preferences', preferences);
    const targetContent = content[viewPosition];
    if (!targetContent || !targetContent.path) return;
    if (!watcher[viewPosition]) return;

    this.stopWatchDirectory(watcher, viewPosition);

    // 監視対象外ディレクトリであれば何もしない
    if (!preferences.watchExcludes || preferences.watchExcludes.includes(targetContent.path)) return;

    // pathが存在する場合のみwatcherを設定
    if (fs.existsSync(targetContent.path)) {
      watcher[viewPosition].path = targetContent.path;
      try {
        // $FlowFixMe
        watcher[viewPosition].handler = fs.watch(targetContent.path, () => {
          if (!this.props.content || !this.props.content.fileAction) return;
          // 他の処理中には動かないようにする
          if (/^(REFRESH|NONE)$/.test(this.props.content.fileAction)) {
            console.log(
              '*** Update directory ***',
              viewPosition,
              targetContent.path
            );
            this.props.fetchItems(viewPosition, true, true);
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
    this.setState({ watcher });
  };

  stopWatchDirectory = (watcher, viewPosition) => {
    const w = watcher;
    if (w[viewPosition].handler) {
      w[viewPosition].handler.close();
      w[viewPosition] = { handler: null, path: '' };
    }
  };

  stopWatchDirectoryAll = () => {
    const { watcher } = this.state;
    this.stopWatchDirectory(watcher,'left');
    this.stopWatchDirectory(watcher,'right');
    this.setState({ watcher });
  };

  // ディレクトリとファイル数を更新
  updateDirectoryInfo = () => {
    // console.dir(this.props.content);
    const getMessages = items => {
      const dirCount = items.filter(
        item => item.isDirectory && item.fileName !== '..'
      ).length;
      const fileCount = items.filter(item => !item.isDirectory).length;
      return `${dirCount} dir(s), ${fileCount} file(s)`;
    };
    if (this.props.content.left) {
      this.contentLeft.updateDirectoryInfo(
        getMessages(this.props.content.left.items)
      );
    }
    if (this.props.content.right) {
      this.contentRight.updateDirectoryInfo(
        getMessages(this.props.content.right.items)
      );
    }
  };

  switchActiveView = () => {
    this.props.switchActiveView();
  };

  moveCursorUp = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    this.props.moveCursorUp(activeView);
  };

  moveCursorDown = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    this.props.moveCursorDown(activeView);
  };

  moveCursorPageUp = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    const rowCount = estimateRowCount(activeView);
    // console.log("estimated rows", rows);

    this.props.moveCursorPageUp(activeView, rowCount);
  };

  moveCursorPageDown = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    const rowCount = estimateRowCount(activeView);
    this.props.moveCursorPageDown(activeView, rowCount);
  };

  moveCursorToTop = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    this.props.moveCursorToTop(activeView);
  };

  moveCursorToBottom = e => {
    const { activeView } = this.props.content;
    e.preventDefault();
    this.props.moveCursorToBottom(activeView);
  };

  changeDirectoryToParent = () => {
    this.props.changeDirectoryToParent(this.props.content.activeView);
  };

  changeDirectoryToHome = () => {
    this.props.changeDirectoryToHome(this.props.content.activeView);
  };

  changeDirectoryToRoot = () => {
    this.props.changeDirectoryToRoot(this.props.content.activeView);
  };

  reloadAllItems = (e, combo) => {
    const { activeView } = this.props.content;
    e.preventDefault();
    const targetView =
      combo === 'end' || combo === 'mod+end'
        ? activeView
        : anotherSideView(activeView);
    const keepMarks = combo === 'mod+end' || combo === 'shift+mod+end';
    this.props.fetchItems(targetView, true, keepMarks);
  };

  execLeftAction = () => {
    const { activeView } = this.props.content;
    this.props.changeActiveView('left', activeView);
  };

  execRightAction = () => {
    const { activeView } = this.props.content;
    this.props.changeActiveView('right', activeView);
  };

  changeInfoType = () => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    this.props.changeInfoType(activeView, activeContent.infoType, 'next');
  };

  markOrUnmarkItem = e => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    e.preventDefault();
    this.props.markOrUnmarkItem(activeView, activeContent.position);
  };

  rangeMarkItem = (e, combo) => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    this.props.rangeMarkItem(
      activeView,
      activeContent.position,
      combo === 'mod+space'
    );
  };

  copyItems = () => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    // コピーすべきデータがある場合のみ実行
    if (activeContent.items.filter(item => item.marked).length > 0) {
      this.props.mayCopy(
        activeView,
        null,
        false,
        this.props.content.overwriteIfNewer,
        this.props.content.enableCopyToFuse,
        this.props.content.overwriteIfNewerSubDirectory
      );
    }
  };

  openCopyToFavoriteDialog = e => {
    // 登録リストがある場合のみダイアログ表示
    if (this.state.preferences.favoritePathList
      && this.state.preferences.favoritePathList.length > 0) {
      e.preventDefault();
      Mousetrap.pause();
      this.copyToFavoriteDialog.open();
    }
  };

  closeCopyToFavoriteDialog = (submit: boolean, value: string) => {
    Mousetrap.unpause();
    if (submit) {
      // 指定ディレクトリへのコピー実施
      const { activeView, activeContent } = getActiveContent(this.props.content);
      // コピーすべきデータがある場合のみ実行
      if (activeContent.items.filter(item => item.marked).length > 0) {
        // 指定ディレクトリへの移動
        console.log('Copying to the directory:', value);
        this.logView.addMessage(`Copying to the directory: ${value}`);
        this.props.mayCopy(
          activeView,
          null,
          false,
          this.props.content.overwriteIfNewer,
          this.props.content.enableCopyToFuse,
          this.props.content.overwriteIfNewerSubDirectory,
          value
        );
      }
    }
  };

  deleteItems = () => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    // 削除すべきデータがある場合のみ実行
    if (activeContent.items.filter(item => item.marked).length > 0) {
      this.props.mayDelete(activeView, null, false);
    }
  };

  moveItems = () => {
    const { activeView, activeContent } = getActiveContent(this.props.content);
    // 移動すべきデータがある場合のみ実行
    if (activeContent.items.filter(item => item.marked).length > 0) {
      this.props.mayMove(
        activeView,
        null,
        false,
        this.props.content.overwriteIfNewer
      );
    }
  };

  openMoveToFavoriteDialog = e => {
    // 登録リストがある場合のみダイアログ表示
    if (this.state.preferences.favoritePathList
      && this.state.preferences.favoritePathList.length > 0) {
      e.preventDefault();
      Mousetrap.pause();
      this.moveToFavoriteDialog.open();
    }
  };

  closeMoveToFavoriteDialog = (submit: boolean, value: string) => {
    Mousetrap.unpause();
    if (submit) {
      // 指定ディレクトリへの移動実施
      const { activeView, activeContent } = getActiveContent(this.props.content);
      // 移動すべきデータがある場合のみ実行
      if (activeContent.items.filter(item => item.marked).length > 0) {
        // 指定ディレクトリへの移動
        console.log('Moving to the directory:', value);
        this.logView.addMessage(`Moving to the directory: ${value}`);
        this.props.mayMove(
          activeView,
          null,
          false,
          this.props.content.overwriteIfNewer,
          value
        );
      }
    }
  };

  execKeyAction = (e, combo) => {
    console.log('combo:', combo);
    const { activeView, activeContent } = getActiveContent(this.props.content);
    e.preventDefault();

    if (combo === 'enter') {
      this.props.execEnter(
        activeView,
        activeContent.position,
        false,
        false,
        this.state.preferences
      );
    }

    if (activeContent.isInvalidPath) return;

    // 以下は表示ディレクトリが有効な場合のみ

    if (combo === 'mod+enter') {
      this.props.execEnter(
        activeView,
        activeContent.position,
        true,
        true,
        this.state.preferences
      );
    }

    if (combo === 'mod+shift+enter') {
      this.props.launchTerminal(
        activeView,
        activeContent.position,
        this.state.preferences.terminalEmulator
      );
    }

    // Ctrl+英数記号: 先頭文字が一致するファイルへのジャンプ
    const key = convertComboKey(combo, this.state.preferences.kbd101);
    if (key != null) {
      this.props.moveCursorToFilePrefix(activeView, key);
    }

    // マークの有無で機能が変わるもの
    if (activeContent.items.filter(item => item.marked).length > 0) {
      if (combo === 'm') this.moveItems();
      if (combo === 'M') {
        this.openMoveToFavoriteDialog(e);
      }
    } else if (combo === 'm' || combo === 'M') {
      Mousetrap.pause();
      this.createDirectoryDialog.open();
    }
  };

  copyPathToClipboard = () => {
    const { activeContent } = getActiveContent(this.props.content);
    const { items, position } = activeContent;
    const item = items[position];
    const targetPath = path.join(
      activeContent.path,
      item.fileName === '..' ? '' : item.fileName
    );
    clipboard.clear();
    clipboard.writeText(targetPath);
    this.logView.addMessage(`Copied current path to clipboard: ${targetPath}`);
  };

  changeDirectoryToAnother = () => {
    const { activeView } = this.props.content;
    this.props.changeDirectoryToAnother(activeView);
  };

  changeAnotherViewDirectory = () => {
    const { activeView } = this.props.content;
    this.props.changeAnotherViewDirectory(activeView);
  };

  closeCreateDirectoryDialog = (submit: boolean, value: string) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.createDirectory(this.props.content.activeView, value);
    }
  };

  // 全ファイルのマーク反転
  markAllFiles = () => {
    const { activeView } = this.props.content;
    this.props.markAllFiles(activeView);
  };

  // 全アイテム(ファイル＆ディレクトリ)のマーク反転
  markAllItems = () => {
    const { activeView } = this.props.content;
    this.props.markAllItems(activeView);
  };

  openChangeSortTypeDialog = () => {
    // console.log('s: ', this.props);
    Mousetrap.pause();
    this.changeSortTypeDialog.open();
  };

  closeChangeSortTypeDialog = (submit: boolean, selectedValue: SortType) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.changeSortTypeAction(
        this.props.content.activeView,
        selectedValue
      );
    }
  };

  openChangeDirectoryDialog = e => {
    e.preventDefault();
    Mousetrap.pause();
    this.changeDirectoryDialog.open();
  };

  closeChangeDirectoryDialog = (submit: boolean, value: string) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.changeDirectoryTo(this.props.content.activeView, value);
    }
  };

  openChangeDirectoryFromFavoritesDialog = e => {
    // 登録リストがある場合のみダイアログ表示
    if (this.state.preferences.favoritePathList
      && this.state.preferences.favoritePathList.length > 0) {
      e.preventDefault();
      Mousetrap.pause();
      this.changeDirectoryFromFavoritesDialog.open();
    }
  };

  closeChangeDirectoryFromFavoritesDialog = (submit: boolean, value: string) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.changeDirectoryTo(this.props.content.activeView, value);
    }
  };

  openChangeDirectoryFromHistoryDialog = e => {
    const { activeContent } = getActiveContent(this.props.content);
    // 履歴がある場合のみダイアログ表示
    if (activeContent.histories.length > 0) {
      e.preventDefault();
      Mousetrap.pause();
      this.changeDirectoryFromHistoryDialog.open();
    }
  };

  closeChangeDirectoryFromHistoryDialog = (
    submit: boolean,
    value: ?HistoryStateType
  ) => {
    Mousetrap.unpause();
    if (value && submit) {
      this.props.changeDirectoryTo(
        this.props.content.activeView,
        value.path,
        value.lastPosition
      );
    }
  };

  openRenameDialog = e => {
    const targetItem = getTargetItem(this.props.content);
    if (!targetItem) return;
    // TODO 編集できないファイル、ディレクトリ判定をまとめる。マークとか。
    if (targetItem.fileName === '..') return;

    e.preventDefault();
    Mousetrap.pause();
    this.renameDialog.open(targetItem);
  };

  mayRename = (
    targetItem: ItemStateType,
    value: ?string,
    mode,
    owner,
    group,
    atime,
    mtime
  ) => {
    this.stopWatchDirectoryAll();
    this.props.mayRename(
      this.props.content.activeView,
      targetItem,
      value,
      mode,
      owner,
      group,
      atime,
      mtime
    );
  };

  closeRenameDialog = () => {
    Mousetrap.unpause();
  };

  closeDeleteDialog = (submit: boolean, withShiftKey: boolean) => {
    if (submit) {
      this.spinner.show();
      this.props.deleteItems(withShiftKey);
    } else {
      Mousetrap.unpause();
      this.props.cancelDelete(withShiftKey);
    }
  };

  closeCopyDialog = (
    submit: boolean,
    withShiftKey: boolean,
    selected: CopyMoveType,
    fileName: ?string
  ) => {
    // console.log('closeCopyDialog', submit);
    if (submit) {
      this.spinner.show();
      if (selected === 'Overwrite') {
        this.props.copyItems(withShiftKey, false);
      } else if (selected === 'OverwriteIfNewer') {
        this.props.copyItems(withShiftKey, true);
      } else if (selected === 'OverwriteIfNewerSubDirectory') {
        this.props.copyItems(withShiftKey, false, null, true);
      } else if (selected === 'ChangeFileName') {
        this.props.copyItems(withShiftKey, false, fileName);
      } else {
        this.props.cancelCopy(withShiftKey);
      }
    } else {
      Mousetrap.unpause();
      this.props.cancelCopy(withShiftKey);
    }
  };

  closeMoveDialog = (
    submit: boolean,
    withShiftKey: boolean,
    selected: string,
    fileName: ?string
  ) => {
    if (submit) {
      this.spinner.show();

      if (selected === 'Overwrite') {
        this.props.moveItems(withShiftKey, false);
      } else if (selected === 'OverwriteIfNewer') {
        this.props.moveItems(withShiftKey, true);
      } else if (selected === 'ChangeFileName') {
        this.props.moveItems(withShiftKey, false, fileName);
      } else {
        this.props.cancelMove(withShiftKey);
      }
    } else {
      Mousetrap.unpause();
      this.props.cancelMove(withShiftKey);
    }
  };

  openPreferenceDialog = e => {
    e.preventDefault();
    Mousetrap.pause();
    this.preferenceDialog.open(this.state.preferences);
  };

  closePreferenceDialog = (submit, result) => {
    Mousetrap.unpause();

    if (submit) {
      this.setState({ preferences: result });
      this.watchDirectory(this.props.content.activeView);
      this.props.fetchItems(this.props.content.activeView, false, false);
    }
  };

  openExecCommandDialog = (e, combo) => {
    const targetItem = combo === 'x' ? getTargetItem(this.props.content) : null;

    e.preventDefault();
    Mousetrap.pause();
    this.execCommandDialog.open(targetItem);
  };

  closeExecCommandDialog = (submit, result) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.execCommand(this.props.content.activeView, result);
    }
  };

  openFileMaskDialog = e => {
    const { activeContent } = getActiveContent(this.props.content);
    e.preventDefault();
    Mousetrap.pause();
    this.fileMaskDialog.open(activeContent.maskPattern);
  };

  closeFileMaskDialog = (submit, result) => {
    Mousetrap.unpause();
    if (submit) {
      this.props.setFileMask(this.props.content.activeView, result);
      this.props.fetchItems(this.props.content.activeView, false, false);
    }
  };

  stopSpinner = () => {
    Mousetrap.unpause();
    console.log('stopSpinner');
    console.log('childProcess', this.props.content.childProcess);
    if (this.props.content.childProcess) this.props.content.childProcess.kill('SIGHUP');
  };

  launchFindMode = e => {
    e.preventDefault();
    Mousetrap.pause();
    const { activeView } = this.props.content;
    if (activeView === 'left') {
      this.contentLeft.launchFindMode();
    } else if (activeView === 'right') {
      this.contentRight.launchFindMode();
    }
  };

  exitFindMode = () => {
    Mousetrap.unpause();
  };

  findItem = (findText, searchNext) => {
    // find mode抜けるまでカーソル操作出来ない
    // Mousetrap.unpause();

    const { activeView } = this.props.content;

    // マッチするファイル、ディレクトリを探してあればカーソルを移動
    // console.log('findText:', findText);
    this.props.findItem(activeView, findText, searchNext);
  };

  switchToInternalView = (e) => {
    e.preventDefault();
    this.props.switchToInternalView();
  };

  exitInternalView = () => {
    Mousetrap.unpause();
    this.props.switchToDirectoryView();
  };

  showApplicationInfo = () => {
    this.logView.addMessage(getApplicationString());
  };

  showReady = () => {
    this.logView.addMessage('Ready.');
  };

  quitApplication = (e, combo) => {
    const { content } = this.props;
    if (combo === 'q') {
      savePreferences(content, this.state.preferences);
    }
    app.quit();
  };

  render() {
    const { content } = this.props;
    const { activeView, activeContent } = getActiveContent(content);

    return (
      <div>
        <div className={styles.container} data-tid="container">
          <div id="mainPanel" className={styles.mainPanel}>
            {content.viewMode === 'TEXT' &&
              <TextView
                content={this.props.content}
                exitView={this.exitInternalView.bind(this)}
              />
            }
            {content.viewMode === 'DIRECTORY' &&
              /* $FlowFixMe */
              <Content
                viewPosition="left"
                ref={ref => {
                  this.contentLeft = ref ? ref.getWrappedInstance() : null;
                }}
                exitFindMode={this.exitFindMode.bind(this)}
                findItem={this.findItem.bind(this)}
                fetchItems={this.props.fetchItems}
                content={this.props.content}
                changeActiveView={this.props.changeActiveView}
              />
            }
            {content.viewMode === 'DIRECTORY' &&
              /* $FlowFixMe */
              <Content
                viewPosition="right"
                ref={ref => {
                  this.contentRight = ref ? ref.getWrappedInstance() : null;
                }}
                exitFindMode={this.exitFindMode.bind(this)}
                findItem={this.findItem.bind(this)}
                fetchItems={this.props.fetchItems}
                content={this.props.content}
                changeActiveView={this.props.changeActiveView}
              />
            }
            <Spinner
              showSpinner={content.showSpinner}
              stopSpinner={this.stopSpinner.bind(this)}
              ref={ref => {
                this.spinner = ref;
              }}
            />
            <ChangeSortTypeDialog
              ref={ref => {
                this.changeSortTypeDialog = ref;
              }}
              closeDialog={this.closeChangeSortTypeDialog.bind(this)}
              activeView={activeView}
              initialValue={activeContent.sortType}
            />
            <GenericDialog
              action="削除"
              ref={ref => {
                this.deleteDialog = ref;
              }}
              closeDialog={this.closeDeleteDialog.bind(this)}
              activeView={activeView}
            />
            <CopyMoveDialog
              action="COPY"
              ref={ref => {
                this.copyDialog = ref;
              }}
              closeDialog={this.closeCopyDialog.bind(this)}
              activeView={activeView}
            />
            <CopyMoveDialog
              action="MOVE"
              ref={ref => {
                this.moveDialog = ref;
              }}
              closeDialog={this.closeMoveDialog.bind(this)}
              activeView={activeView}
            />
            <CreateDirectoryDialog
              ref={ref => {
                this.createDirectoryDialog = ref;
              }}
              closeDialog={this.closeCreateDirectoryDialog.bind(this)}
              activeView={activeView}
            />
            <ChangeDirectoryDialog
              ref={ref => {
                this.changeDirectoryDialog = ref;
              }}
              closeDialog={this.closeChangeDirectoryDialog.bind(this)}
              activeView={activeView}
            />
            <SelectFavoriteDialog
              ref={ref => {
                this.changeDirectoryFromFavoritesDialog = ref;
              }}
              closeDialog={this.closeChangeDirectoryFromFavoritesDialog.bind(
                this
              )}
              activeView={activeView}
              favorites={this.state.preferences.favoritePathList}
              currentPath={activeContent.path}
              message="登録パスリストからのディレクトリ変更"
            />
            <SelectFavoriteDialog
              ref={ref => {
                this.copyToFavoriteDialog = ref;
              }}
              closeDialog={this.closeCopyToFavoriteDialog.bind(
                this
              )}
              activeView={activeView}
              favorites={this.state.preferences.favoritePathList}
              currentPath={activeContent.path}
              message="登録パスリストへのコピー"
            />
            <SelectFavoriteDialog
              ref={ref => {
                this.moveToFavoriteDialog = ref;
              }}
              closeDialog={this.closeMoveToFavoriteDialog.bind(
                this
              )}
              activeView={activeView}
              favorites={this.state.preferences.favoritePathList}
              currentPath={activeContent.path}
              message="登録パスリストへの移動"
            />
            <ChangeDirectoryFromHistoryDialog
              ref={ref => {
                this.changeDirectoryFromHistoryDialog = ref;
              }}
              closeDialog={this.closeChangeDirectoryFromHistoryDialog.bind(
                this
              )}
              activeView={activeView}
              histories={activeContent.histories}
              currentPath={activeContent.path}
            />
            <RenameDialog
              ref={ref => {
                this.renameDialog = ref;
              }}
              mayExec={this.mayRename.bind(this)}
              closeDialog={this.closeRenameDialog.bind(this)}
              activeView={activeView}
            />
            <PreferenceDialog
              ref={ref => {
                this.preferenceDialog = ref;
              }}
              closeDialog={this.closePreferenceDialog.bind(this)}
            />
            <ExecCommandDialog
              ref={ref => {
                this.execCommandDialog = ref;
              }}
              closeDialog={this.closeExecCommandDialog.bind(this)}
              activeView={activeView}
            />
            <FileMaskDialog
              ref={ref => {
                this.fileMaskDialog = ref;
              }}
              closeDialog={this.closeFileMaskDialog.bind(this)}
              activeView={activeView}
            />
          </div>
          <LogView
            ref={ref => {
              this.logView = ref;
            }}
          />
          <StatusBar
            ref={ref => {
              this.statusBar = ref;
            }}
            content={content}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps({ content }) {
  return { content };
}

function mapDispatchToProps(dispatch) {
  return {
    switchActiveView: bindActionCreators(switchActiveView, dispatch),
    moveCursorUp: bindActionCreators(moveCursorUp, dispatch),
    moveCursorDown: bindActionCreators(moveCursorDown, dispatch),
    moveCursorPageUp: bindActionCreators(moveCursorPageUp, dispatch),
    moveCursorPageDown: bindActionCreators(moveCursorPageDown, dispatch),
    moveCursorToTop: bindActionCreators(moveCursorToTop, dispatch),
    moveCursorToBottom: bindActionCreators(moveCursorToBottom, dispatch),
    moveCursorToFilePrefix: bindActionCreators(
      moveCursorToFilePrefix,
      dispatch
    ),
    execEnter: bindActionCreators(execEnter, dispatch),
    changeDirectoryToParent: bindActionCreators(
      changeDirectoryToParent,
      dispatch
    ),
    changeDirectoryToHome: bindActionCreators(changeDirectoryToHome, dispatch),
    changeDirectoryToRoot: bindActionCreators(changeDirectoryToRoot, dispatch),
    changeActiveView: bindActionCreators(changeActiveView, dispatch),
    changeInfoType: bindActionCreators(changeInfoType, dispatch),
    markOrUnmarkItem: bindActionCreators(markOrUnmarkItem, dispatch),
    rangeMarkItem: bindActionCreators(rangeMarkItem, dispatch),
    copyItems: bindActionCreators(copyItems, dispatch),
    mayCopy: bindActionCreators(mayCopy, dispatch),
    cancelCopy: bindActionCreators(cancelCopy, dispatch),
    deleteItems: bindActionCreators(deleteItems, dispatch),
    mayDelete: bindActionCreators(mayDelete, dispatch),
    cancelDelete: bindActionCreators(cancelDelete, dispatch),
    moveItems: bindActionCreators(moveItems, dispatch),
    mayMove: bindActionCreators(mayMove, dispatch),
    cancelMove: bindActionCreators(cancelMove, dispatch),
    createDirectory: bindActionCreators(createDirectory, dispatch),
    changeDirectoryTo: bindActionCreators(changeDirectoryTo, dispatch),
    fetchItems: bindActionCreators(fetchItems, dispatch),
    changeDirectoryToAnother: bindActionCreators(
      changeDirectoryToAnother,
      dispatch
    ),
    changeAnotherViewDirectory: bindActionCreators(
      changeAnotherViewDirectory,
      dispatch
    ),
    markAllFiles: bindActionCreators(markAllFiles, dispatch),
    markAllItems: bindActionCreators(markAllItems, dispatch),
    changeSortTypeAction: bindActionCreators(changeSortTypeAction, dispatch),
    findItem: bindActionCreators(findItem, dispatch),
    mayRename: bindActionCreators(mayRename, dispatch),
    refreshDone: bindActionCreators(refreshDone, dispatch),
    reset: bindActionCreators(reset, dispatch),
    launchTerminal: bindActionCreators(launchTerminal, dispatch),
    execCommand: bindActionCreators(execCommand, dispatch),
    setFileMask: bindActionCreators(setFileMask, dispatch),
    switchToDirectoryView: bindActionCreators(switchToDirectoryView, dispatch),
    switchToInternalView: bindActionCreators(switchToInternalView, dispatch)
  };
}

// $FlowFixMe
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Home);
