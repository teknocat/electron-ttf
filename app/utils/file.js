// @flow
import path from 'path';
import fs from 'fs';
import untildify from 'untildify';
import os from 'os';
import Mode from 'stat-mode';
import moment from 'moment';
import is from 'electron-is';
import type { ItemStateType } from '../utils/types';

const posix = !is.windows() && process.env.NODE_ENV !== 'test' ? require('posix-ext') : null;

// ファイル名を本体と拡張子に分類
export function extractBodyAndExt(fileName: string) {
  const { ext } = path.parse(fileName);
  const body = path.basename(fileName, ext);
  return {
    body,
    ext: ext ? ext.substring(1) : ''
  };
}

export function anotherSideView(viewName: string) {
  return viewName === 'left' ? 'right' : 'left';
}

// ディレクトリが存在しなければnullを返す
export function convertPath(origPath: string, baseDir: string = os.homedir()) {
  // ~ではじまるパスを変換
  // TODO ~ユーザ名の形式は未対応
  const tmpPath = untildify(origPath);

  let target;
  if (path.isAbsolute(tmpPath)) {
    target = tmpPath;
  } else {
    // console.log('baseDir', baseDir);
    // console.log('origPath', origPath);
    target = path.join(baseDir, origPath);
  }
  if (!fs.existsSync(target)) {
    return null;
  }
  return fs.realpathSync(target);
}

export function getFileModeString(file: ItemStateType) {
  if (!file.stats) return '';
  // TODO 未実装
  if (file.stats.vf) return '';
  const mode = Mode(file.stats);
  let string = mode.toString();
  if (file.isSymbolicLink) {
    string = `l${string.substr(1)}`;
  }
  return string;
}

export function getFileDateString(file: ItemStateType) {
  if (!file.stats) return '';
  const date = file.stats.vf ? file.stats.vf.fileDate : new Date(file.stats.mtimeMs);
  return moment(date).format('YYYY/MM/DD HH:mm');
}

export function getFileSizeString(file: ItemStateType) {
  if (file.isDirectory) return '< DIR >';
  if (!file.stats) return '';
  return file.stats.vf ? file.stats.vf.fileSize : file.stats.size;
}

export function getFileOwnerString(file: ItemStateType) {
  const { stats } = file;
  if (!stats) return '';
  // TODO 未実装
  if (file.stats.vf) return '';

  // TODO windowsの場合の処理
  if (!posix) return '';
  // console.log('user', passwdUser.sync(stats.uid));
  // console.log('user', posix.getpwnam(stats.uid));
  // return `${stats.uid}:${stats.gid}`;
  // return `${passwdUser.sync(stats.uid).username}:${stats.gid}`;
  // return '';
  return `${posix.getpwnam(stats.uid).name}:${posix.getgrnam(stats.gid).name}`;
}
