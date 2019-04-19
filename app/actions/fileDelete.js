// @flow
import * as fse from 'fs-extra';
import path from 'path';
import is from "electron-is";
import {spawn} from "child_process";
import type { ActionType, ItemStateType } from '../utils/types';
import {
  DELETED_ITEM,
  DELETING_ITEM,
  MAY_DELETE_ITEM,
  CANCEL_DELETE_ITEM,
} from '../utils/types';
import { convertPath } from '../utils/file';
import {getActiveContent} from "../utils/util";

function mayDeleteAction(
  viewPosition: string,
  targetItem: ItemStateType,
  remains: Array<ItemStateType>,
  needToConfirm: boolean,
  isForced: boolean
) {
  return {
    type: MAY_DELETE_ITEM,
    viewPosition,
    targetItem,
    needToConfirm,
    isForced,
    remains
  };
}

export function mayDelete(
  isForced: boolean
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, activeContent } = getActiveContent(content);
    const { itemRemains } = content;
    const items = itemRemains.length > 0 ? itemRemains : activeContent.items.filter(item => item.marked);

    if (items.length > 0) {
      const target = items.shift();

      // 強制削除モードでなければ確認
      const needToConfirm = !isForced;
      dispatch(
        mayDeleteAction(activeView, target, items, needToConfirm, isForced)
      );
    }
  };
}

export function deleteItems(withShiftKey: boolean) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    // console.log('deleteItems', content);
    const { activeView, targetItem, itemRemains } = content;

    // 対象ファイルの行位置を取得
    const row = content[activeView].items
      .map(item => item.fileName)
      .indexOf(targetItem.fileName);
    if (row < 0) {
      console.error('not found', targetItem);
      return;
    }

    // 削除処理を実施
    const srcDir = convertPath(content[activeView].path);
    if (srcDir == null) return;
    const srcPath = path.join(srcDir, targetItem.fileName);
    console.log(`delete: ${srcPath}`);

    if (is.windows()) {
      // .asarファイルが削除出来ない問題を回避
      // $FlowFixMe
      process.noAsar = true;
      fse.remove(srcPath, err => {
        // $FlowFixMe
        process.noAsar = false;
        if (err) {
          console.error(err);
          // 残りがあっても処理終了
          dispatch(
            cancelDeleteAction(activeView, targetItem, [], withShiftKey, true)
          );
          return;
        }
        dispatch({
          type: DELETED_ITEM,
          viewPosition: activeView,
          row,
          targetItem,
          isForced: withShiftKey,
          remains: itemRemains
        });
      });
    } else {
      // rm -rf を呼び出す
      const args = ['-rf', srcPath];
      const process = spawn('rm', args);
      // const process = spawn('sleep', ['5']);
      console.log('process', process);
      process.on('error', (err) => {
        console.error(err);
        // 残りがあっても処理終了
        dispatch(
          cancelDeleteAction(activeView, targetItem, [], withShiftKey, true)
        );
      });
      process.on('close', (code, signal) => {
        console.log('close code:', code);
        console.log('close signal:', signal);
        if (code === 0) {
          dispatch({
            type: DELETED_ITEM,
            viewPosition: activeView,
            row,
            targetItem,
            isForced: withShiftKey,
            remains: itemRemains
          });

        } else {
          const isError = signal !== 'SIGHUP';
          dispatch(
            cancelDeleteAction(activeView, targetItem, [], withShiftKey, isError)
          );
        }
      });

      console.log('*** deleting now ***');
      dispatch({
        type: DELETING_ITEM,
        viewPosition: activeView,
        row,
        targetItem,
        isForced: withShiftKey,
        remains: itemRemains,
        childProcess: process
      });
    }
  };
}

function cancelDeleteAction(
  viewPosition,
  targetItem,
  remains,
  isForced,
  isError
) {
  return {
    type: CANCEL_DELETE_ITEM,
    viewPosition,
    targetItem,
    isForced,
    remains,
    isError
  };
}

export function cancelDelete(withShiftKey: boolean) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, targetItem, itemRemains } = content;

    dispatch(
      cancelDeleteAction(
        activeView,
        targetItem,
        itemRemains,
        withShiftKey,
        false
      )
    );
  };
}
