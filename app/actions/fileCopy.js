// @flow
import fs from 'fs';
import * as fse from 'fs-extra';
import path from 'path';
import { exec, spawn } from 'child_process';
import is from 'electron-is';
import shellescape from 'shell-escape';
import type { ActionType, ItemStateType } from '../utils/types';
import {
  MAY_COPY_ITEM,
  COPYING_ITEM,
  COPIED_ITEM,
  CANCEL_COPY_ITEM,
  SKIP_COPY_ITEM
} from '../utils/types';
import { anotherSideView, convertPath } from '../utils/file';
import { addLogMessage } from './content';
import { getActiveContent } from '../utils/util';

function mayCopyAction(
  viewPosition,
  targetItem,
  remains,
  needToConfirm,
  isForced,
  ifNewer,
  ifNewerSubDirectory,
  destDir
): ActionType {
  return {
    type: MAY_COPY_ITEM,
    viewPosition,
    targetItem,
    needToConfirm,
    isForced,
    ifNewer,
    ifNewerSubDirectory,
    remains,
    destDir
  };
}

export function mayCopy(
  viewPosition: string,
  remains: ?Array<ItemStateType>,
  isForced: boolean,
  ifNewer: boolean,
  enableCopyToFuse: boolean,
  ifNewerSubDirectory?: boolean = false,
  favoritePath?: string
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView } = content;
    const items =
      remains || content[viewPosition].items.filter(item => item.marked);

    if (items.length > 0) {
      const target = items.shift();

      const destDir = convertPath(favoritePath || content[anotherSideView(activeView)].path);
      if (destDir) {
        if (is.linux()) {
          // 対象ディレクトリのファイルシステムタイプを stat -f --printf=%T で取得。fuseblkなら未実装扱いする
          const args = ['stat', '-f', '--printf=%T', destDir];
          exec(shellescape(args), (err, stdout) => {
            if (err) {
              dispatch(addLogMessage(`Can't copy to directory: ${destDir}`));
              return;
            }
            if (stdout === 'fuseblk' && !enableCopyToFuse) {
              dispatch(
                addLogMessage(
                  `[BUG] Can't copy to FUSE file system: ${destDir}`
                )
              );
              return;
            }

            const destPath = path.join(destDir, target.fileName);
            // ファイルが存在している場合は確認が必要
            // ただし強制コピーモードの場合は確認しない
            const needToConfirm = isForced ? false : fs.existsSync(destPath);
            dispatch(
              mayCopyAction(
                viewPosition,
                target,
                items,
                needToConfirm,
                isForced,
                ifNewer,
                ifNewerSubDirectory,
                favoritePath
              )
            );
          });
        } else {
          const destPath = path.join(destDir, target.fileName);
          // ファイルが存在している場合は確認が必要
          // ただし強制コピーモードの場合は確認しない
          const needToConfirm = isForced ? false : fs.existsSync(destPath);
          dispatch(
            mayCopyAction(
              viewPosition,
              target,
              items,
              needToConfirm,
              isForced,
              ifNewer,
              ifNewerSubDirectory,
              favoritePath
            )
          );
        }
      } else {
        dispatch(
          addLogMessage(
            `Can't copy to directory: ${destDir || favoritePath || content[anotherSideView(activeView)].path}`
          )
        );
      }
    }
  };
}

// ifNewer: コピー対象が元よりも新しい場合のみコピー
// newFileName: 名前変更コピー時のファイル名
// ifNewerSubDirectory: コピー対象のサブディレクトリ、ファイルが元よりも新しい場合のみコピー
// destDir: コピー先ディレクトリ(登録ディレクトリへのコピー用)
export function copyItems(
  withShiftKey: boolean,
  ifNewer: boolean,
  newFileName: ?string,
  ifNewerSubDirectory?: boolean = false,
  destDir: ?string
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

    const srcDirectory = convertPath(activeContent.path);
    const destDirectory = convertPath(destDir || idleContent.path);
    if (srcDirectory == null || destDirectory == null) return;
    const srcPath = path.join(srcDirectory, targetItem.fileName);
    const destPath = path.join(destDirectory, newFileName || targetItem.fileName);

    console.log(`${srcPath} -> ${destPath}`);

    // コピー元と先がまったく同じパスの場合はコピーしない
    if (srcPath === destPath) {
      console.error("Can't copy to same path:", destPath);
      dispatch(
        cancelCopyAction(
          activeView,
          targetItem,
          [],
          withShiftKey,
          true,
          "Can't copy to same path"
        )
      );
      return;
    }
    // 名前変更コピー時に変更後ファイル名が重複していた場合はエラー
    if (newFileName && fs.existsSync(destPath)) {
      console.error('File exists:', destPath);
      dispatch(
        cancelCopyAction(
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
    // 新しい場合だけコピー時、コピー先ファイルと同じか古ければスキップ
    if (ifNewer) {
      const destStats = fs.statSync(destPath);
      if (targetItem.stats.mtimeMs <= destStats.mtimeMs) {
        console.log('skipped:', srcPath);
        dispatch(
          skipCopyAction(
            activeView,
            targetItem,
            itemRemains,
            withShiftKey,
            ifNewer,
            ifNewerSubDirectory,
            'Older than target file'
          )
        );
        return;
      }
    }

    if (is.windows()) {
      // Windows向けにはcp -prの簡単な代替方法がないので、エラー覚悟でそのまま利用
      fse.copy(
        srcPath,
        destPath,
        {
          overwrite: true,
          errorOnExist: true,
          preserveTimestamps: true
        },
        err => {
          if (err) {
            console.error(err);
            // 残りがあっても処理終了
            dispatch(
              cancelCopyAction(activeView, targetItem, [], withShiftKey, true)
            );
            return;
          }
          dispatch({
            type: COPIED_ITEM,
            viewPosition: activeView,
            row,
            targetItem,
            isForced: withShiftKey,
            ifNewer,
            ifNewerSubDirectory,
            remains: itemRemains
          });
        }
      );
    } else {
      // rsyncでは、コピー対象がディレクトリの場合srcPath末尾に/をつける必要あり
      const srcPathRsync = targetItem.isDirectory ? `${srcPath}/` : srcPath;
      // 新しいものだけ上書きの場合には -u オプションもつける
      const option = ifNewer || ifNewerSubDirectory ? '-au' : '-a';
      const args = [option, srcPathRsync, destPath];
      const process = spawn('rsync', args);
      // const process = spawn('sleep', ['5']);
      console.log('process', process);
      process.on('error', (err) => {
        console.error(err);
        // 残りがあっても処理終了
        dispatch(
          cancelCopyAction(activeView, targetItem, [], withShiftKey, true)
        );
      });
      process.on('close', (code, signal) => {
        console.log('close code:', code);
        console.log('close signal:', signal);
        if (code === 0) {
          dispatch({
            type: COPIED_ITEM,
            viewPosition: activeView,
            row,
            targetItem,
            isForced: withShiftKey,
            ifNewer,
            ifNewerSubDirectory,
            remains: itemRemains
          });

        } else {
          // 終了コード20はユーザ中断なのでキャンセル扱いに
          const isError = signal !== 'SIGHUP' && code !== 20;
          dispatch(
            cancelCopyAction(activeView, targetItem, [], withShiftKey, isError)
          );
        }
      });

      console.log('*** copying now ***');
      dispatch({
        type: COPYING_ITEM,
        viewPosition: activeView,
        row,
        targetItem,
        isForced: withShiftKey,
        ifNewer,
        ifNewerSubDirectory,
        remains: itemRemains,
        childProcess: process
      });
    }
  };
}

function cancelCopyAction(
  viewPosition,
  targetItem,
  remains,
  isForced,
  isError,
  logMessage
) {
  return {
    type: CANCEL_COPY_ITEM,
    viewPosition,
    targetItem,
    isForced,
    remains,
    isError,
    logMessage
  };
}

export function cancelCopy(withShiftKey: boolean) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();
    const { activeView, targetItem, itemRemains } = content;

    dispatch(
      cancelCopyAction(activeView, targetItem, itemRemains, withShiftKey, false)
    );
  };
}

function skipCopyAction(
  viewPosition,
  targetItem,
  remains,
  isForced,
  ifNewer,
  ifNewerSubDirectory,
  logMessage
) {
  return {
    type: SKIP_COPY_ITEM,
    viewPosition,
    targetItem,
    isForced,
    remains,
    ifNewer,
    ifNewerSubDirectory,
    logMessage
  };
}
