// @flow
import { remote } from 'electron';
import packageJson from '../../package.json';

const { app } = remote;

export function getApplicationString() {
  return `${packageJson.productName}, Version ${app.getVersion()}.`;
}

export function getShortApplicationString() {
  return `${packageJson.productName} v${app.getVersion()}`;
}
