// @flow

import { anotherSideView } from '../../utils/file';
import type {ContentStateType} from "../../utils/types";

const Mousetrap = require('mousetrap-pause')(require('mousetrap'));

type Props = {
  content: ContentStateType,
  copyItems: (forced: boolean, overwriteIfNewer: boolean, newFileName: ?string, OverwriteIfNewerSubDirectory: ?boolean, destDir: ?string) => void,
  mayCopy: (forced: boolean, destDir?: ?string) => void,
  fetchItems: (viewPosition: string, keepPosition?: boolean, keepMarks?: boolean) => void,
  deleteItems: (forced: boolean) => void,
  mayDelete: (forced: boolean) => void,
  moveItems: (forced: boolean, ifNewer: boolean, newFileName: ?string, destDir: ?string) => void,
  mayMove: (forced: boolean, destDir?: ?string) => void,
  reset: () => void,
  refreshDone: (viewPosition: string) => void
};

// TODO shouldComponentUpdateをうまく使う
export const needToUpdate = (prevProps: Props, props: Props) =>
  props.content.actionState !== prevProps.content.actionState ||
  props.content.fileAction !== prevProps.content.fileAction;

export const doCopy = (prevProps: Props, props: Props, _this: any) => {
  if (!needToUpdate(prevProps, props)) return;
  const { content } = props;
  if (!content) return;
  const { targetItem, actionState } = content;
  if (!targetItem || !actionState) return;

  // コピー前
  if (actionState === 'START') {
    // ファイル監視を止める
    _this.stopWatchDirectoryAll();

    Mousetrap.pause();

    console.log('Copy:', targetItem.fileName);
    _this.logView.addMessage(`Copy: ${targetItem.fileName}`);

    // コピーするかどうか確認が必要
    if (content.needToConfirm) {
      console.log('NEED TO CONFIRM:', targetItem.fileName);
      // 確認ダイアログ出して処理を促す
      _this.spinner.hide();
      _this.copyDialog.open(targetItem);
    } else {
      console.log('Copy start:', targetItem.fileName);
      _this.spinner.show();
      props.copyItems(
        content.forced,
        content.overwriteIfNewer,
        null,
        content.overwriteIfNewerSubDirectory,
        content.destDir
      );
    }
  }

  // コピー中
  if (actionState === 'DOING') {
    console.log('Copying:', targetItem.fileName);
    console.log('childProcess:', content.childProcess);
  }

    // コピー後
  if (/^(DONE|CANCELED|ERROR|SKIPPED)$/.test(actionState)) {
    // コピー成功
    if (actionState === 'DONE') {
      console.log('Copy done:', targetItem.fileName);
      _this.logView.updateMessage(' ... done');
    }

    // コピーキャンセル
    if (actionState === 'CANCELED') {
      console.log('Copy canceled:', targetItem.fileName);
      _this.logView.updateMessage(' ... canceled');
    }

    // コピー時エラー
    if (actionState === 'ERROR') {
      console.log('Copy error:', targetItem.fileName);
      const message = content.logMessage || 'ERROR';
      _this.logView.updateMessage(` ... ${message}`);
    }

    // コピースキップ
    if (actionState === 'SKIPPED') {
      console.log('Copy skipped:', targetItem.fileName);
      _this.logView.updateMessage(' ... skipped');
    }

    // 後続のアイテムが存在すれば続けてコピー
    const { activeView, itemRemains, forced, destDir } = content;
    if (itemRemains.length > 0) {
      props.mayCopy(forced, destDir);
    } else {
      _this.spinner.hide();
      _this.logView.addMessage('Finished.');
      // カーソル位置を保持しておく
      console.log('doCopy: activeView:', activeView);
      props.fetchItems(activeView, true, true);
      props.fetchItems(anotherSideView(activeView), true, true);

      Mousetrap.unpause();
      _this.showReady();
    }
  }
};

export const doDelete = (prevProps: Props, props: Props, _this: any) => {
  if (!needToUpdate(prevProps, props)) return;
  if (!props.content) return;
  const { targetItem, actionState } = props.content;
  if (!targetItem || !actionState) return;

  // 削除前
  if (actionState === 'START') {
    // ファイル監視を止める
    _this.stopWatchDirectoryAll();

    Mousetrap.pause();

    console.log('Delete:', targetItem.fileName);
    _this.logView.addMessage(`Delete: ${targetItem.fileName}`);

    // 削除するかどうか確認が必要
    if (props.content.needToConfirm) {
      console.log('NEED TO CONFIRM:', targetItem.fileName);
      // 確認ダイアログ出して処理を促す
      _this.spinner.hide();
      _this.deleteDialog.open();
    } else {
      console.log('Deleting:', targetItem.fileName);
      _this.spinner.show();
      props.deleteItems(props.content.forced);
    }
  }

  // 削除中
  if (actionState === 'DOING') {
    console.log('Deleting:', targetItem.fileName);
    console.log('childProcess:', props.content.childProcess);
  }

  // 削除後
  if (/^(DONE|CANCELED|ERROR)$/.test(actionState)) {
    // 削除成功
    if (actionState === 'DONE') {
      console.log('Delete done:', targetItem.fileName);
      _this.logView.updateMessage(' ... done');
    }

    // 削除キャンセル
    if (actionState === 'CANCELED') {
      console.log('Delete canceled:', targetItem.fileName);
      _this.logView.updateMessage(' ... canceled');
    }

    // 削除時エラー
    if (actionState === 'ERROR') {
      console.log('Delete error:', targetItem.fileName);
      _this.logView.updateMessage(' ... ERROR');
    }

    // 後続のアイテムが存在すれば続けて削除
    const { activeView, itemRemains, forced } = props.content;
    if (itemRemains.length > 0) {
      props.mayDelete(forced);
    } else {
      _this.spinner.hide();
      _this.logView.addMessage('Finished.');
      // カーソル位置を保持しておく
      props.fetchItems(activeView, true, true);
      props.fetchItems(anotherSideView(activeView), true, true);

      Mousetrap.unpause();
      _this.showReady();
    }
  }
};

export const doMove = (prevProps: Props, props: Props, _this: any) => {
  if (!needToUpdate(prevProps, props)) return;
  const { content } = props;
  if (!content) return;
  const { targetItem, actionState } = content;
  if (!targetItem || !actionState) return;

  // 移動前
  if (actionState === 'START') {
    // ファイル監視を止める
    _this.stopWatchDirectoryAll();

    Mousetrap.pause();

    console.log('Move:', targetItem.fileName);
    _this.logView.addMessage(`Move: ${targetItem.fileName}`);

    // 移動するかどうか確認が必要
    if (content.needToConfirm) {
      console.log('NEED TO CONFIRM:', targetItem.fileName);
      // 確認ダイアログ出して処理を促す
      _this.spinner.hide();
      _this.moveDialog.open(targetItem);
    } else {
      console.log('Move start:', targetItem.fileName);
      _this.spinner.show();
      props.moveItems(content.forced, content.overwriteIfNewer, null, content.destDir);
    }
  }

  // 移動中
  if (actionState === 'DOING') {
    console.log('Moving:', targetItem.fileName);
    console.log('childProcess:', content.childProcess);
  }

  // 移動後
  if (/^(DONE|CANCELED|ERROR|SKIPPED)$/.test(actionState)) {
    // 移動成功
    if (actionState === 'DONE') {
      console.log('Move done:', targetItem.fileName);
      _this.logView.updateMessage(' ... done');
    }

    // 移動キャンセル
    if (actionState === 'CANCELED') {
      console.log('Move canceled:', targetItem.fileName);
      _this.logView.updateMessage(' ... canceled');
    }

    // 移動時エラー
    if (actionState === 'ERROR') {
      console.log('Move error:', targetItem.fileName);
      const message = content.logMessage || 'ERROR';
      _this.logView.updateMessage(` ... ${message}`);
    }
    // 移動スキップ
    if (actionState === 'SKIPPED') {
      console.log('Move skipped:', targetItem.fileName);
      _this.logView.updateMessage(' ... skipped');
    }

    // 後続のアイテムが存在すれば続けて移動
    const { activeView, itemRemains, forced, destDir } = content;
    if (itemRemains.length > 0) {
      props.mayMove(forced, destDir);
    } else {
      _this.spinner.hide();
      _this.logView.addMessage('Finished.');
      // カーソル位置を保持しておく
      props.fetchItems(activeView, true, true);
      props.fetchItems(anotherSideView(activeView), true, true);

      Mousetrap.unpause();
      _this.showReady();
    }
  }
};

export const doCreateDirectory = (prevProps: Props, props: Props, _this: any) => {
  const { dstFileName } = props.content;
  if (!dstFileName) return;

  if (props.content.actionState === 'DONE') {
    _this.logView.addMessage(`Directory created: ${dstFileName}`);
  }

  if (props.content.actionState === 'CANCELED') {
    _this.logView.addMessage(`Directory already exists: ${dstFileName}`);
  }

  _this.showReady();
};

export const doRename = (prevProps: Props, props: Props, _this: any) => {
  const { activeView, targetItem, dstFileName } = props.content;
  if (!targetItem) return;

  if (props.content.actionState === 'DONE') {
    if (dstFileName) {
      _this.logView.addMessage(`Renamed: ${targetItem.fileName} -> ${dstFileName}`);
    } else {
      _this.logView.addMessage(`Changed file info: ${targetItem.fileName}`);
    }
  }

  if (props.content.actionState === 'CANCELED') {
    if (dstFileName) {
      _this.logView.addMessage(`Renamed: ${targetItem.fileName} -> ${dstFileName} ... ERROR`);
    } else {
      _this.logView.addMessage(`Changed file info: ${targetItem.fileName} ... ERROR`);
    }
  }

  _this.renameDialog.closeModal(true);
  props.fetchItems(activeView, true);
  props.fetchItems(anotherSideView(activeView), true);

  _this.showReady();
};

export const doLogging = (prevProps: Props, props: Props, _this: any) => {
  const { logMessage } = props.content;

  _this.logView.addMessage(logMessage);
  props.reset();

  _this.showReady();
};

export const doRefresh = (prevProps: Props, props: Props, _this: any, viewPosition: string) => {
  _this.updateDirectoryInfo();

  // 前回とマーク状態が違えばマーク対象情報の更新
  const markItems = props.content[viewPosition].items.filter(
    item => item.marked
  );
  // console.log('markItems:', markItems);
  const marks = markItems.map((item, index) => index);
  const prevMarks = prevProps.content[viewPosition].items
    .filter(item => item.marked)
    .map((item, index) => index);
  // console.log('marks:', marks);
  // console.log('prevMarks:', prevMarks);

  // マークがない場合は情報クリア
  if (markItems.length === 0) {
    if (viewPosition === 'left') {
      _this.contentLeft.updateMarkInfo('');
    } else if (viewPosition === 'right') {
      _this.contentRight.updateMarkInfo('');
    }
  } else if (
    !marks.every(index => prevMarks.includes(index)) ||
    marks.length !== prevMarks.length
  ) {
    // マーククリアした際にも評価されるようにする
    const totalSize = markItems
      .filter(item => !item.isDirectory)
      .reduce((a, c) => (c.stats ? a + c.stats.size : a), 0);
    // console.log('marked files:', marks.length);
    // console.log('total marked size:', totalSize);
    let message = '';
    if (marks.length > 0) {
      const dirCount = markItems.filter(item => item.isDirectory).length || 0;
      message = `marked ${dirCount} dir(s), ${marks.length -
        dirCount} file(s), size:${totalSize} byte(s)`;
    }
    if (viewPosition === 'left') {
      _this.contentLeft.updateMarkInfo(message);
    } else if (viewPosition === 'right') {
      _this.contentRight.updateMarkInfo(message);
    }
  }

  props.refreshDone(viewPosition);
};
