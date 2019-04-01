// @flow
import fs from 'fs';
import path from 'path';
import { addLogMessage, changeDirectoryAndFetch } from './content';
import type { ActionType } from '../utils/types';
import { CREATE_DIRECTORY, CANCEL_CREATE_DIRECTORY } from '../utils/types';
import { convertPath } from '../utils/file';

export function createDirectoryAction(
  viewPosition: string,
  dstFileName: string
) {
  return {
    type: CREATE_DIRECTORY,
    viewPosition,
    dstFileName
  };
}

export function cancelCreateDirectoryAction(
  viewPosition: string,
  dstFileName: string
) {
  return {
    type: CANCEL_CREATE_DIRECTORY,
    viewPosition,
    dstFileName
  };
}

export function createDirectory(viewPosition: string, directory: ?string) {
  return (dispatch: (action: ActionType) => void, getState: Function) => {
    const { content } = getState();

    // TODO directoryを信用しない。無効な文字チェック必要。
    if (directory && directory.length > 0) {
      const srcDir = convertPath(content[viewPosition].path);
      if (srcDir == null) {
        dispatch(addLogMessage(`Can't create directory`));
        return;
      }
      const srcPath = path.join(srcDir, directory);
      console.log(`mkdir: ${srcPath}`);
      if (!fs.existsSync(srcPath)) {
        try {
          fs.mkdirSync(srcPath);
          dispatch(createDirectoryAction(viewPosition, directory));
          changeDirectoryAndFetch(
            srcPath,
            0,
            dispatch,
            viewPosition,
            content[viewPosition].path,
            content[viewPosition].position
          );
        } catch (err) {
          console.error(err);
          dispatch(addLogMessage(`Can't create directory: ${srcPath}`));
        }
      } else {
        dispatch(cancelCreateDirectoryAction(viewPosition, directory));
      }
    }
  };
}
