const fs = window.require('fs');
const path = window.require('path');
import { IsNotLinux } from './Linux';

let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
if (!fs.existsSync(launcherWatcher)) {
  launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
}

let powerShell = 'file://not_found';
if (IsNotLinux) {
  powerShell = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

export const PowerShell = powerShell
export const LauncherAutoClose = launcherWatcher;
