// @flow

import settings from 'electron-settings';
import type {ContentStateType, PreferenceType} from "../../utils/types";
import {getInitialPreferences} from "../../reducers/initialState";

export const getTargetItem = (content: ContentStateType) => {
  if (!content) return null;
  const { activeView } = content;
  if (!content[activeView] || !content[activeView].items) return null;
  return content[activeView].items[content[activeView].position];
};

export const setupPreferences = () => {
  const initPrefs = getInitialPreferences();
  const myPrefs = settings.get('electronTTF.preferences');

  return {
    terminalEmulator: myPrefs && myPrefs.terminalEmulator ? myPrefs.terminalEmulator : initPrefs.terminalEmulator,
    kbd101: myPrefs && myPrefs.kbd101 ? myPrefs.kbd101 : initPrefs.kbd101,
    watchExcludes: myPrefs && myPrefs.watchExcludes ? myPrefs.watchExcludes : initPrefs.watchExcludes,
    showPathOnTitleBar: myPrefs && myPrefs.showPathOnTitleBar ? myPrefs.showPathOnTitleBar : initPrefs.showPathOnTitleBar
  }
};

export const savePreferences = (content: ContentStateType, preferences: PreferenceType) => {
  const {left, right} = content;
  settings.set('electronTTF', {
    content: {
      activeView: content.activeView,
      left: {
        path: left ? left.path : '',
        sortType: left ? left.sortType : '',
        infoType: left ? left.infoType : ''
      },
      right: {
        path: right ? right.path : '',
        sortType: right ? right.sortType : '',
        infoType: right ? right.infoType : ''
      }
    },
    preferences
  });
};

// コンテンツ表示領域当たりの行数を推定する
export const estimateRowCount = (activeView: string) => {
  const contentElement = document.getElementById(`content_${activeView}`);
  const rowElement = document.getElementById(`item_${activeView}_0`);
  if (!contentElement || !rowElement) return 0;
  return Math.floor(contentElement.clientHeight / rowElement.offsetHeight) - 5;
};

// Ctrl+英数記号のコンボリストを作成
export const createMoveCursorToFilePrefixComboList = (kbd101: ?boolean) => {
  const comboList = [];
  for (let i = 'a'.charCodeAt(0); i <= 'z'.codePointAt(0); i += 1) {
    const char = String.fromCharCode(i);
    comboList.push(`mod+${char}`);
  }
  for (let i = '0'.charCodeAt(0); i <= '9'.codePointAt(0); i += 1) {
    const char = String.fromCharCode(i);
    comboList.push(`mod+${char}`);
  }
  if (kbd101) {
    comboList.push('mod+-');
    comboList.push('mod+=');
    comboList.push('mod+`');
    comboList.push('mod+[');
    comboList.push('mod+]');
    comboList.push('mod+;');
    comboList.push("mod+'");
    comboList.push('mod+,');
    comboList.push('mod+.');
    comboList.push('mod+shift+1'); // mod+!
    comboList.push('mod+shift+2'); // mod+@
    comboList.push('mod+shift+3'); // mod+#
    comboList.push('mod+shift+4'); // mod+$
    comboList.push('mod+shift+5'); // mod+%
    comboList.push('mod+shift+6'); // mod+^
    comboList.push('mod+shift+7'); // mod+&  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+8'); // mod+*  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+9'); // mod+(  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+0'); // mod+)  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+-'); // mod+_
    comboList.push('mod+shift+='); // mod++
    comboList.push('mod+shift+\\'); // mod+|
    comboList.push('mod+shift+`'); // mod+~
    comboList.push('mod+shift+['); // mod+{
    comboList.push('mod+shift+]'); // mod+}
    comboList.push('mod+shift+;'); // mod+:
    comboList.push("mod+shift+'"); // mod+"
    comboList.push('mod+shift+,'); // mod+<
    comboList.push('mod+shift+.'); // mod+>
    comboList.push('mod+shift+/'); // mod+?
  } else {
    comboList.push('mod+-');
    comboList.push('mod+^');
    comboList.push('mod+@');
    comboList.push('mod+[');
    comboList.push('mod+;');
    comboList.push('mod+:');
    comboList.push('mod+]');
    comboList.push('mod+,');
    comboList.push('mod+.');
    comboList.push('mod+/');
    comboList.push('mod+shift+1'); // mod+!
    comboList.push('mod+shift+2'); // mod+"
    comboList.push('mod+shift+3'); // mod+#
    comboList.push('mod+shift+4'); // mod+$
    comboList.push('mod+shift+5'); // mod+%
    comboList.push('mod+shift+6'); // mod+&
    comboList.push('mod+shift+7'); // mod+'  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+8'); // mod+(  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+9'); // mod+)  Window Managerのキーバインドとぶつかっている
    comboList.push('mod+shift+-'); // mod+=
    comboList.push('mod+shift+^'); // mod+~
    comboList.push('mod+shift+@'); // mod+`
    comboList.push('mod+shift+['); // mod+{
    comboList.push('mod+shift+;'); // mod++
    comboList.push('mod+shift+:'); // mod+*
    comboList.push('mod+shift+]'); // mod+}
    comboList.push('mod+shift+,'); // mod+<
    comboList.push('mod+shift+.'); // mod+>
    comboList.push('mod+shift+/'); // mod+?
  }

  // console.log('comboList', comboList);
  return comboList;
};

// Mousetrapが認識するコンボキー文字列を、対応する文字に変換
export const convertComboKey = (combo: string, kbd101: ?boolean) => {
  if (kbd101) {
    const match = combo.match(/^mod\+([a-z0-9\-=`;',])$/);
    if (match != null) {
      return match[1];
    }

    switch (combo) {
      case 'mod+.':
        return '\\.';
      case 'mod+[':
        return '\\[';
      case 'mod+]':
        return '\\]';
      case 'mod+shift+1':
        return '!';
      case 'mod+shift+2':
        return '@';
      case 'mod+shift+3':
        return '#';
      case 'mod+shift+4':
        return '\\$';
      case 'mod+shift+5':
        return '%';
      case 'mod+shift+6':
        return '\\^';
      case 'mod+shift+7':
        return '&';
      case 'mod+shift+8':
        return '\\*';
      case 'mod+shift+9':
        return '\\(';
      case 'mod+shift+0':
        return '\\)';
      case 'mod+shift+-':
        return '_';
      case 'mod+shift+=':
        return '\\+';
      case 'mod+shift+\\':
        return '\\|';
      case 'mod+shift+`':
        return '~';
      case 'mod+shift+[':
        return '\\{';
      case 'mod+shift+]':
        return '\\';
      case 'mod+shift+;':
        return ':';
      case "mod+shift+'":
        return '"';
      case 'mod+shift+,':
        return '<';
      case 'mod+shift+.':
        return '>';
      case 'mod+shift+/':
        return '\\?';
      default:
    }

  } else {
    const match = combo.match(/^mod\+([a-z0-9\-^\\@;:,/])$/);
    if (match != null) {
      return match[1];
    }

    switch (combo) {
      case 'mod+.':
        return '\\.';
      case 'mod+[':
        return '\\[';
      case 'mod+]':
        return '\\]';
      case 'mod+shift+1':
        return '!';
      case 'mod+shift+2':
        return '"';
      case 'mod+shift+3':
        return '#';
      case 'mod+shift+4':
        return '\\$';
      case 'mod+shift+5':
        return '%';
      case 'mod+shift+6':
        return '&';
      case 'mod+shift+7':
        return '\\\'';
      case 'mod+shift+8':
        return '\\(';
      case 'mod+shift+9':
        return '\\)';
      // case 'mod+shift+0':
      case 'mod+shift+-':
        return '\\=';
      case 'mod+shift+^':
        return '~';
      case 'mod+shift+\\':
        return '\\|';
      case 'mod+shift+`':
        return '@';
      case 'mod+shift+[':
        return '\\{';
      case 'mod+shift+;':
        return '\\+';
      case 'mod+shift+:':
        return '\\*';
      case 'mod+shift+]':
        return '\\';
      case 'mod+shift+,':
        return '<';
      case 'mod+shift+.':
        return '>';
      case 'mod+shift+/':
        return '\\?';
      default:
    }
  }
};
