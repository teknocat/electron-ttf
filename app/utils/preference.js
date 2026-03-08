// @flow
import { settingsGet } from './settings';

export default function getFindItemType() {
  return settingsGet('electronTTF.findItemType', 'PartialMatch');
}
