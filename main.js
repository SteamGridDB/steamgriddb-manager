const { app, globalShortcut, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const chokidar = require('chokidar')

const path = require('path');
const url = require('url');

autoUpdater.autoInstallOnAppQuit = true;

log.catchErrors({ showDialog: true });

log.info(`Started SGDB Manager ${app.getVersion()}`);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  autoUpdater.checkForUpdatesAndNotify();
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    icon: path.join(__dirname, 'assets/icons/192x192.png'),
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'public', 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  // Set up live reload
  if (process.mainModule.filename.indexOf('app.asar') === -1) {
    chokidar.watch('public')
      .on('change', () => {
        mainWindow.webContents.executeJavaScript('window.location = window.location.origin + window.location.pathname');
      });
  }

  // Add a global shortcut for opening the dev tools
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('beforeunload', () => {
    globalShortcut.unregisterAll();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
