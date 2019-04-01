// @flow
import settings from "electron-settings";

export default function getFindItemType() {
  return settings.get('electronTTF.findItemType', 'PartialMatch');
}
