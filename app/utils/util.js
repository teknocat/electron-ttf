// @flow

import path from "path";
import is from "electron-is";
import type {ContentStateType, ItemListStateType, ItemStateType} from './types';
import { anotherSideView } from './file';

// 正規表現版 findIndex
export function regexFindIndex(items: Array<string>, re: RegExp, startIndex: number) {
  // console.log('items', items);
  // console.log('re', re);
  const index = items.slice(startIndex).findIndex(item => item.match(re));
  return index < 0 ? -1 : index + startIndex;
}
export const getActiveContent = (content: ContentStateType) => {
  const { activeView } = content;
  return {
    activeView,
    activeContent: content[activeView],
    idleContent: content[anotherSideView(activeView)]
  };
};

export function getMaskInfo(viewPosition?: string, content?: ContentStateType) {
  // console.log('getMaskInfo', viewPosition, content);
  if (!viewPosition || !content) return '';
  const currentPath = content[viewPosition].path;
  const isRoot = path.parse(currentPath).root === currentPath;
  let delimiter;
  if (isRoot) {
    delimiter = '';
  } else {
    delimiter = is.windows() ? '\\' : '/';
  }
  return `${delimiter}${content[viewPosition].maskPattern}`;
}

export function getPathInfo(itemList: ItemListStateType, maskInfo) {
  let currentPath;
  if (itemList.isVirtualFolder) {
    const target: ItemStateType = itemList.virtualFolderTarget;
    currentPath = `${target.fileName}:${itemList.virtualPath}`;
  } else {
    currentPath = itemList.path;
  }
  return `${currentPath}${maskInfo}`;
}
