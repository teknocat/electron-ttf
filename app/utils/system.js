// @flow
import electron from 'electron';
import packageJson from '../../package.json';

const remote = electron.remote || null;
const app = remote && remote.app ? remote.app : null;

function getAppVersion() {
  if (app && typeof app.getVersion === 'function') {
    return app.getVersion();
  }
  return packageJson.version;
}

export function getApplicationString() {
  return `${packageJson.productName}, Version ${getAppVersion()}.`;
}

export function getShortApplicationString() {
  return `${packageJson.productName} v${getAppVersion()}`;
}
