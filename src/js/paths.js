const fs = window.require('fs');
const path = window.require('path');

let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
if (!fs.existsSync(launcherWatcher)) {
  launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
}

export const PowerShell = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

export const LauncherAutoClose = launcherWatcher;
