// @flow
import fs from 'fs';
import path from 'path';
import is from 'electron-is';
import type { ActionType, ItemStateType } from '../utils/types';
import { RENAME_ITEM } from '../utils/types';
import { convertPath } from '../utils/file';

const posix = !is.windows() && process.env.NODE_ENV !== 'test' ? require('posix-ext') : null;

export function renameItemAction(
  viewPosition: string,
  targetItem: ItemStateType,
  dstFileName: ?string,
  isSucceeded: boolean
) {
  return {
    type: RENAME_ITEM,
    viewPosition,
    targetItem,
    dstFileName,
    isSucceeded
  };
}

export function mayRename(
  viewPosition: string,
  targetItem: ItemStateType,
  dstFileName: ?string,
  mode: any,
  owner: ?string,
  group: ?string,
  atime: any,
  mtime: any
) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();

    // console.log('viewPosition', viewPosition);
    // console.log('targetItem', targetItem);
    // console.log('dstFileName', dstFileName);
    // console.log('mode', mode);
    // console.log('owner', owner);
    // console.log('group', group);
    // console.log('mtime', mtime);

    const srcDir = convertPath(content[viewPosition].path);
    if (srcDir == null) return;

    // dstFileName が nullの場合はファイル名変更はしない。mode変更などファイル名変更以外を実施
    if (dstFileName != null) {
      const srcPath = path.join(srcDir, targetItem.fileName);
      const dstPath = path.join(srcDir, dstFileName);
      // 変更先ファイル名が存在していればrenameしない
      // renameSyncでは判定してくれない
      if (fs.existsSync(dstPath)) {
        dispatch(
          renameItemAction(viewPosition, targetItem, dstFileName, false)
        );
        return;
      }
      try {
        fs.renameSync(srcPath, dstPath);
      } catch (err) {
        console.error(err);
        dispatch(
          renameItemAction(viewPosition, targetItem, dstFileName, false)
        );
        return;
      }
    }

    const targetPath =
      dstFileName != null
        ? path.join(srcDir, dstFileName)
        : path.join(srcDir, targetItem.fileName);

    // mode変更
    if (mode) {
      let modeValue = 0;
      if (mode.owner.read) modeValue |= fs.constants.S_IRUSR; // eslint-disable-line no-bitwise
      if (mode.owner.write) modeValue |= fs.constants.S_IWUSR; // eslint-disable-line no-bitwise
      if (mode.owner.execute) modeValue |= fs.constants.S_IXUSR; // eslint-disable-line no-bitwise
      if (mode.group.read) modeValue |= fs.constants.S_IRGRP; // eslint-disable-line no-bitwise
      if (mode.group.write) modeValue |= fs.constants.S_IWGRP; // eslint-disable-line no-bitwise
      if (mode.group.execute) modeValue |= fs.constants.S_IXGRP; // eslint-disable-line no-bitwise
      if (mode.others.read) modeValue |= fs.constants.S_IROTH; // eslint-disable-line no-bitwise
      if (mode.others.write) modeValue |= fs.constants.S_IWOTH; // eslint-disable-line no-bitwise
      if (mode.others.execute) modeValue |= fs.constants.S_IXOTH; // eslint-disable-line no-bitwise

      // console.log('targetPath', targetPath);
      // console.log('modeValue', modeValue.toString(8));
      try {
        fs.chmodSync(targetPath, modeValue);
      } catch (err) {
        console.error(err);
        dispatch(
          renameItemAction(viewPosition, targetItem, dstFileName, false)
        );
        return;
      }
    }

    // 所有者情報変更
    if (posix && (owner || group)) {
      // console.log('owner', owner);
      // console.log('group', group);
      try {
        const udb = posix.getpwnam(owner);
        const gdb = posix.getgrnam(group);
        // console.log('udb', udb);
        // console.log('gdb', gdb);
        fs.chownSync(targetPath, udb.uid, gdb.gid);
      } catch (err) {
        console.error(err);
        dispatch(
          renameItemAction(viewPosition, targetItem, dstFileName, false)
        );
        return;
      }
    }

    // timestamp変更
    if (mtime) {
      // console.log('mtime', mtime);
      try {
        fs.utimesSync(targetPath, atime, mtime);
      } catch (err) {
        console.error(err);
        dispatch(
          renameItemAction(viewPosition, targetItem, dstFileName, false)
        );
        return;
      }
    }

    dispatch(renameItemAction(viewPosition, targetItem, dstFileName, true));
  };
}
