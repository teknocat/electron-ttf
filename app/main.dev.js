/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
// import MenuBuilder from './menu';
import parseArgs from 'electron-args';

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const cli = parseArgs(`
    Electron TTF - Tiny TF (Electron Edition)
 
    Usage
      $ ettf [OPTION]...
 
    Options
      --help                  show help
      --version               show version
      -L directory            initial directory on left window
      -R directory            initial directory on right window
      --debug                 enable debug mode (open devtools)
      --enable-copy-to-fuse   [EXPERIMENTAL] enable copy to FUSE directory
 
    Examples
      $ ettf -L /tmp
`, {
  alias: {
    h: 'help'
  },
  default: {
    debug: false,
    enableCopyToFuse: false
  }
});

global.sharedObject = {
  cliFlags: {
    L: cli.flags.L,
    R: cli.flags.R,
    enableCopyToFuse: cli.flags.enableCopyToFuse
  }
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();

    if (process.env.NODE_ENV === 'development' || cli.flags.debug) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('close', (e) => {
    if (mainWindow) {
      e.preventDefault();
      mainWindow.webContents.send('app-close');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // メニューを付けない
  mainWindow.setMenu(null);
  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();
});

ipcMain.on('closed', () => {
  mainWindow = null;
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
