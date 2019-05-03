// @flow
import {
  SWITCH_ACTIVE_VIEW,
  MOVE_CURSOR_UP,
  MOVE_CURSOR_DOWN,
  MOVE_CURSOR_TO,
  RETRIEVE_FILE_LIST,
  CHANGE_DIRECTORY,
  CHANGE_SORT_TYPE,
  CHANGE_INFO_TYPE,
  MARK_ITEM,
  RANGE_MARK_ITEM,
  COPYING_ITEM,
  COPIED_ITEM,
  MAY_COPY_ITEM,
  DELETING_ITEM,
  DELETED_ITEM,
  MAY_DELETE_ITEM,
  MARK_ALL_ITEMS,
  MARK_ALL_FILES,
  CANCEL_COPY_ITEM,
  CANCEL_DELETE_ITEM,
  MOVING_ITEM,
  MOVED_ITEM,
  MAY_MOVE_ITEM,
  CANCEL_MOVE_ITEM,
  CREATE_DIRECTORY,
  CANCEL_CREATE_DIRECTORY,
  RENAME_ITEM,
  ADD_LOG_MESSAGE,
  REFRESH_DONE,
  RESET_ACTION,
  SKIP_COPY_ITEM,
  SKIP_MOVE_ITEM,
  SET_FILE_MASK,
  SWITCH_TO_TEXT_VIEW,
  SWITCH_TO_IMAGE_VIEW,
  SWITCH_TO_DIRECTORY_VIEW, CHANGE_VIRTUAL_FOLDER
} from '../utils/types';
import {getInitialState} from './initialState';
import {anotherSideView} from '../utils/file';
import type {ActionType, ContentStateType} from "../utils/types";

export default function content(
  state: ContentStateType = getInitialState(),
  action: ActionType
) {
  // console.log('reducer:state', state);
  // console.log('reducer:action', action);
  switch (action.type) {
    case SWITCH_ACTIVE_VIEW:
      return {
        ...state,
        activeView: anotherSideView(state.activeView),
        fileAction: 'NONE',
      };
    case MOVE_CURSOR_UP:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          position: state[action.viewPosition].position - 1,
        }
      });
    case MOVE_CURSOR_DOWN:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          position: state[action.viewPosition].position + 1,
        }
      });
    case MOVE_CURSOR_TO:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          position: action.currentPosition,
        },
        fileAction: 'NONE',
      });
    case RETRIEVE_FILE_LIST:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          position: action.currentPosition,
          items: action.items,
          isInvalidPath: action.isInvalidPath,
          needToRefresh: true,
        },
        fileAction: 'NONE',
        targetItem: null,
        needToConfirm: false,
        forced: false,
        overwriteIfNewer: false,
        itemRemains: [],
      });
    case CHANGE_DIRECTORY:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          path: action.path,
          position: action.cursorPosition || 0,
          // 重複をなくした履歴リストを作成
          histories: action.currentPath !== null ?
            [
              {path: action.currentPath, lastPosition: action.currentPosition},
              ...state[action.viewPosition].histories.filter(history => history.path !== action.currentPath)
            ] :
            state[action.viewPosition].histories
          ,
          isVirtualFolder: false,
        }
      });
    case CHANGE_SORT_TYPE:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: [],
          sortType: action.sortType,
        }
      });
    case CHANGE_INFO_TYPE:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          infoType: action.infoType,
        }
      });
    case MARK_ITEM: {
      if (!action.viewPosition) return state;
      const {items} = state[action.viewPosition];
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: [
            ...items.slice(0, action.row),
            Object.assign({}, items[action.row], {
              marked: action.mark,
            }),
            ...items.slice(action.row + 1)
          ],
          needToRefresh: true,
        },
      });
    }
    case RANGE_MARK_ITEM: {
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: action.items,
          needToRefresh: true,
        },
      });
    }
    case MAY_COPY_ITEM:
      return {
        ...state,
        fileAction: 'COPY',
        targetItem: action.targetItem,
        actionState: 'START',
        needToConfirm: action.needToConfirm,
        forced: action.isForced,
        overwriteIfNewer: action.ifNewer,
        overwriteIfNewerSubDirectory: action.ifNewerSubDirectory,
        itemRemains: action.remains,
        destDir: action.destDir
      };
    case CANCEL_COPY_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'COPY',
        targetItem: action.targetItem,
        actionState: action.isError ? 'ERROR' : 'CANCELED',
        needToConfirm: false,
        forced: false,
        overwriteIfNewer: false,
        overwriteIfNewerSubDirectory: false,
        itemRemains: action.isForced ? [] : action.remains,
        needToRefresh: true,
        logMessage: action.logMessage,
      });
    }
    case SKIP_COPY_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'COPY',
        targetItem: action.targetItem,
        actionState: 'SKIPPED',
        needToConfirm: false,
        forced: action.isForced,
        overwriteIfNewer: action.ifNewer,
        overwriteIfNewerSubDirectory: action.ifNewerSubDirectory,
        itemRemains: action.remains,
        needToRefresh: true,
        logMessage: action.logMessage,
      });
    }
    case COPYING_ITEM:
      return {
        ...state,
        fileAction: 'COPY',
        targetItem: action.targetItem,
        actionState: 'DOING',
        needToConfirm: false,
        forced: false,
        itemRemains: action.remains,
        childProcess: action.childProcess
      };
    case COPIED_ITEM: {
      if (!action.viewPosition) return state;
      const {items} = state[action.viewPosition];
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: [
            ...items.slice(0, action.row),
            Object.assign({}, items[action.row], {
              marked: false,
            }),
            ...items.slice(action.row + 1)
          ]
        },
        fileAction: 'COPY',
        targetItem: action.targetItem,
        actionState: 'DONE',
        forced: action.isForced,
        overwriteIfNewer: action.ifNewer,
        itemRemains: action.remains,
        needToRefresh: true,
        overwriteIfNewerSubDirectory: action.ifNewerSubDirectory
      });
    }
    case MAY_DELETE_ITEM:
      return {
        ...state,
        fileAction: 'DELETE',
        targetItem: action.targetItem,
        actionState: 'START',
        needToConfirm: action.needToConfirm,
        forced: action.isForced,
        itemRemains: action.remains
      };
    case CANCEL_DELETE_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'DELETE',
        targetItem: action.targetItem,
        actionState: action.isError ? 'ERROR' : 'CANCELED',
        needToConfirm: false,
        forced: false,
        overwriteIfNewer: false,
        itemRemains: action.isForced ? [] : action.remains,
        needToRefresh: true,
      });
    }
    case DELETING_ITEM:
      return {
        ...state,
        fileAction: 'DELETE',
        targetItem: action.targetItem,
        actionState: 'DOING',
        needToConfirm: false,
        forced: false,
        itemRemains: action.remains,
        childProcess: action.childProcess
      };
    case DELETED_ITEM: {
      if (!action.viewPosition) return state;
      const {items} = state[action.viewPosition];
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: [
            ...items.slice(0, action.row),
            Object.assign({}, items[action.row], {
              marked: false,
            }),
            ...items.slice(action.row + 1)
          ]
        },
        fileAction: 'DELETE',
        targetItem: action.targetItem,
        actionState: 'DONE',
        forced: action.isForced,
        overwriteIfNewer: false,
        itemRemains: action.remains,
        needToRefresh: true,
      });
    }
    case MAY_MOVE_ITEM:
      return {
        ...state,
        fileAction: 'MOVE',
        targetItem: action.targetItem,
        actionState: 'START',
        needToConfirm: action.needToConfirm,
        forced: action.isForced,
        overwriteIfNewer: false,
        itemRemains: action.remains,
        destDir: action.destDir
      };
    case CANCEL_MOVE_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'MOVE',
        targetItem: action.targetItem,
        actionState: action.isError ? 'ERROR' : 'CANCELED',
        needToConfirm: false,
        forced: false,
        overwriteIfNewer: false,
        itemRemains: action.isForced ? [] : action.remains,
        needToRefresh: true,
        logMessage: action.logMessage,
      });
    }
    case SKIP_MOVE_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'MOVE',
        targetItem: action.targetItem,
        actionState: 'SKIPPED',
        needToConfirm: false,
        forced: action.isForced,
        overwriteIfNewer: action.ifNewer,
        itemRemains: action.remains,
        needToRefresh: true,
        logMessage: action.logMessage,
      });
    }
    case MOVING_ITEM:
      return {
        ...state,
        fileAction: 'MOVE',
        targetItem: action.targetItem,
        actionState: 'DOING',
        needToConfirm: false,
        forced: false,
        itemRemains: action.remains,
        childProcess: action.childProcess
      };
    case MOVED_ITEM: {
      if (!action.viewPosition) return state;
      const {items} = state[action.viewPosition];
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: [
            ...items.slice(0, action.row),
            Object.assign({}, items[action.row], {
              marked: false,
            }),
            ...items.slice(action.row + 1)
          ]
        },
        fileAction: 'MOVE',
        targetItem: action.targetItem,
        actionState: 'DONE',
        forced: action.isForced,
        overwriteIfNewer: false,
        itemRemains: action.remains,
        needToRefresh: true,
      });
    }

    case CREATE_DIRECTORY: {
      return {
        ...state,
        fileAction: 'MKDIR',
        dstFileName: action.dstFileName,
        actionState: 'DONE',
        forced: false,
        overwriteIfNewer: false,
        itemRemains: [],
      }
    }
    case CANCEL_CREATE_DIRECTORY: {
      return {
        ...state,
        fileAction: 'MKDIR',
        dstFileName: action.dstFileName,
        actionState: 'CANCELED',
        forced: false,
        overwriteIfNewer: false,
        itemRemains: [],
      }
    }
    case MARK_ALL_ITEMS: {
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: action.items,
          needToRefresh: true,
        },
      });
    }
    case MARK_ALL_FILES: {
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          items: action.items,
          needToRefresh: true,
        },
      });
    }
    case RENAME_ITEM: {
      return Object.assign({}, state, {
        fileAction: 'RENAME',
        actionState: action.isSucceeded ? 'DONE' : 'CANCELED',
        targetItem: action.targetItem,
        dstFileName: action.dstFileName,
      });
    }
    case ADD_LOG_MESSAGE: {
      return Object.assign({}, state, {
        fileAction: 'LOGGING',
        logMessage: action.logMessage,
      });
    }
    case REFRESH_DONE: {
      if (!action.viewPosition) return state;
      return Object .assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          needToRefresh: false,
        },
        fileAction: 'NONE',
      });
    }
    case RESET_ACTION: {
      return Object.assign({}, state, {
        fileAction: 'NONE',
        actionState: 'INIT',
        logMessage: null,
        dstFileName: null,
        forced: false,
        overwriteIfNewer: false,
        itemRemains: [],
        needToRefresh: false,
        needToConfirm: false,
      });
    }
    case SET_FILE_MASK:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          maskPattern: action.maskPattern,
          needToRefresh: true,
        },
      });
    case SWITCH_TO_TEXT_VIEW:
      if (!action.targetItem) return state;
      return {
        ...state,
        viewMode: "TEXT",
        targetItem: action.targetItem,
      };
    case SWITCH_TO_IMAGE_VIEW:
      if (!action.targetItem) return state;
      return {
        ...state,
        viewMode: "IMAGE",
        targetItem: action.targetItem,
      };
    case SWITCH_TO_DIRECTORY_VIEW:
      return {
        ...state,
        viewMode: "DIRECTORY",
      };
    case CHANGE_VIRTUAL_FOLDER:
      if (!action.viewPosition) return state;
      return Object.assign({}, state, {
        [action.viewPosition]: {
          ...state[action.viewPosition],
          isVirtualFolder: true,
          virtualFolderTarget: action.virtualFolderTarget,
          virtualFolderEntries: action.virtualFolderEntries,
          virtualPath: action.path,
          position: action.cursorPosition || 0,
        }
      });

    default:
      return state;
  }
}
