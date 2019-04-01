// @flow
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import is from "electron-is";
import type { ActionType, ItemStateType } from '../utils/types';
import {
  MAY_MOVE_ITEM,
  MOVING_ITEM,
  MOVED_ITEM,
  CANCEL_MOVE_ITEM,
  SKIP_MOVE_ITEM,
} from '../utils/types';
import { anotherSideView, convertPath } from '../utils/file';
import { addLogMessage } from './content';
import { getActiveContent } from '../utils/util';

function mayMoveAction(
  viewPosition,
  targetItem,
  remains,
  needToConfirm,
  isForced,
  ifNewer
) {
  return {
    type: MAY_MOVE_ITEM,
    viewPosition,
    targetItem,
    needToConfirm,
    isForced,
    ifNewer,
    remains
  };
}

export function mayMove(
  viewPosition: string,
  remains: ?Array<ItemStateType>,
  isForced: boolean,
  ifNewer: boolean
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView } = content;
    const items =
      remains || content[viewPosition].items.filter(item => item.marked);

    if (items.length > 0) {
      const target = items.shift();

      const destDir = convertPath(content[anotherSideView(activeView)].path);
      if (destDir) {
        const destPath = path.join(destDir, target.fileName);
        // ファイルが存在している場合は確認が必要
        // ただし強制移動モードの場合は確認しない
        const needToConfirm = isForced ? false : fs.existsSync(destPath);
        dispatch(
          mayMoveAction(
            viewPosition,
            target,
            items,
            needToConfirm,
            isForced,
            ifNewer
          )
        );
      } else {
        dispatch(
          addLogMessage(
            `Can't move to directory: ${
              content[anotherSideView(activeView)].path
            }`
          )
        );
      }
    }
  };
}

// ifNewer: コピー対象が元よりも新しい場合のみコピー
// newFileName: 名前変更移動時のファイル名
export function moveItems(
  withShiftKey: boolean,
  ifNewer: boolean,
  newFileName: ?string
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    // console.log('copyItems', content);
    const { activeView, activeContent, idleContent } = getActiveContent(
      content
    );
    if (activeContent == null || idleContent == null) return;
    const { targetItem, itemRemains } = content;
    if (targetItem == null) return;

    // 対象ファイルの行位置を取得
    const row = activeContent.items
      .map(item => item.fileName)
      .indexOf(targetItem.fileName);
    if (row < 0) {
      console.error('not found', targetItem);
      return;
    }

    // 移動処理を実施
    const srcDir = convertPath(activeContent.path);
    const destDir = convertPath(idleContent.path);
    if (srcDir == null || destDir == null) return;
    const srcPath = path.join(srcDir, targetItem.fileName);
    const destPath = path.join(destDir, newFileName || targetItem.fileName);

    console.log(`${srcPath} -> ${destPath}`);

    // 移動元と先がまったく同じパスの場合はコピーしない
    if (srcPath === destPath) {
      console.error("Can't move to same path:", destPath);
      dispatch(
        cancelMoveAction(
          activeView,
          targetItem,
          [],
          withShiftKey,
          true,
          "Can't move to same path"
        )
      );
      return;
    }
    // 名前変更移動時に変更後ファイル名が重複していた場合はエラー
    if (newFileName && fs.existsSync(destPath)) {
      console.error('File exists:', destPath);
      dispatch(
        cancelMoveAction(
          activeView,
          targetItem,
          [],
          withShiftKey,
          true,
          'File exists'
        )
      );
      return;
    }
    // 新しい場合だけ移動時、移動先ファイルと同じか古ければスキップ
    if (ifNewer) {
      const destStats = fs.statSync(destPath);
      if (targetItem.stats.mtimeMs <= destStats.mtimeMs) {
        console.log('skipped:', srcPath);
        dispatch(
          skipMoveAction(
            activeView,
            targetItem,
            itemRemains,
            withShiftKey,
            ifNewer,
            'Older than target file'
          )
        );
        return;
      }
    }

    if (is.windows()) {
      fs.rename(srcPath, destPath, err => {
        if (err) {
          console.error(err);
          // 残りがあっても処理終了
          dispatch(
            cancelMoveAction(activeView, targetItem, [], withShiftKey, true)
          );
          return;
        }
        dispatch({
          type: MOVED_ITEM,
          viewPosition: activeView,
          row,
          targetItem,
          isForced: withShiftKey,
          ifNewer,
          remains: itemRemains
        });
      });
    } else {
      // mvを使う場合、移動元がディレクトリの場合、移動先は親ディレクトリ指定にする
      // ただし変更後名が指定されている場合はそれを利用する
      const destPathMv = targetItem.isDirectory && !newFileName ? destDir : destPath;
      const args = [srcPath, destPathMv];
      const process = spawn('mv', args);
      // const process = spawn('sleep', ['5']);
      console.log('process', process);
      process.on('error', (err) => {
        console.error(err);
        // 残りがあっても処理終了
        dispatch(
          cancelMoveAction(activeView, targetItem, [], withShiftKey, true)
        );
      });
      process.on('close', (code, signal) => {
        console.log('close code:', code);
        console.log('close signal:', signal);
        if (code === 0) {
          dispatch({
            type: MOVED_ITEM,
            viewPosition: activeView,
            row,
            targetItem,
            isForced: withShiftKey,
            ifNewer,
            remains: itemRemains
          });

        } else {
          const isError = signal !== 'SIGHUP';
          dispatch(
            cancelMoveAction(activeView, targetItem, [], withShiftKey, isError)
          );
        }
      });

      console.log('*** moving now ***');
      dispatch({
        type: MOVING_ITEM,
        viewPosition: activeView,
        row,
        targetItem,
        isForced: withShiftKey,
        ifNewer,
        remains: itemRemains,
        childProcess: process
      });

    }
  };
}

function cancelMoveAction(
  viewPosition,
  targetItem,
  remains,
  isForced,
  isError,
  logMessage
) {
  return {
    type: CANCEL_MOVE_ITEM,
    viewPosition,
    targetItem,
    isForced,
    remains,
    isError,
    logMessage
  };
}

function skipMoveAction(
  viewPosition,
  targetItem,
  remains,
  isForced,
  ifNewer,
  logMessage
) {
  return {
    type: SKIP_MOVE_ITEM,
    viewPosition,
    targetItem,
    isForced,
    remains,
    ifNewer,
    logMessage
  };
}

export function cancelMove(withShiftKey: boolean) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, targetItem, itemRemains } = content;

    dispatch(
      cancelMoveAction(activeView, targetItem, itemRemains, withShiftKey, false)
    );
  };
}
