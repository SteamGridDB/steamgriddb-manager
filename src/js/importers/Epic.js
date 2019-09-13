const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const jsonminify = window.require('jsonminify');
const {arch} = window.require('os');
const log = window.require('electron-log');

class Epic {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\EpicGames\\Unreal Engine'
            });

            reg.get('INSTALLDIR', (err, installDir) => {
                if (err) {
                    if (err.code == 1) {
                        return resolve(false);
                    }
                    reject(new Error('Could not check if Epic Games Launcher is installed.'));
                }

                const exeExists = fs.existsSync(path.join(installDir.value, 'Launcher', 'Engine', 'Binaries', 'Win32', 'EpicGamesLauncher.exe'));
                resolve(exeExists);
            });
        });
    }

    static getEpicPath() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\EpicGames\\Unreal Engine'
            });

            reg.get('INSTALLDIR', (err, installDir) => {
                if (err) {
                    reject(new Error('Could not find Epic Games Launcher path.'));
                }

                resolve(installDir.value);
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            log.info('Import: Started egs');
            this.getEpicPath().then((epicPath) => {
                // Get path to LauncherAutoClose.ps1
                let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
                if (!fs.existsSync(launcherWatcher)) {
                    launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
                }

                const powershellExe = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

                const games = [];
                let binFolder;
                if (arch == 'ia32') {
                    binFolder = 'Win32';
                } else if (arch == 'x64') {
                    binFolder = 'Win64';
                }
                const binaryPath = path.join(epicPath, 'Launcher', 'Portal', 'Binaries', binFolder);
                const manifestsDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';

                if (!fs.existsSync(manifestsDir)) {
                    return resolve([]);
                }

                fs.readdirSync(manifestsDir).forEach((file) => {
                    if (path.extname(file) === '.item') {
                        const launcherDataStr = fs.readFileSync(path.join(manifestsDir, file)).toString();
                        const parsed = JSON.parse(jsonminify(launcherDataStr));
                        games.push({
                            id: parsed.AppName,
                            name: parsed.DisplayName,
                            exe: `"${powershellExe}"`,
                            icon: `"${path.join(parsed.InstallLocation, parsed.LaunchExecutable)}"`,
                            startIn: `"${binaryPath}"`,
                            params: `-windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command "& \\"${launcherWatcher}\\"" -launcher \\"EpicGamesLauncher\\" -game \\"${path.parse(parsed.LaunchExecutable).name}\\" -launchcmd \\"com.epicgames.launcher://apps/${parsed.AppName}?action=launch&silent=true\\""`,
                            platform: 'egs'
                        });
                    }
                });
                log.info('Import: Completed egs');
                resolve(games);
            }).catch((err) => reject(err));
        });
    }
}

export default Epic;
export const name = 'Epic Games Launcher';
export const id = 'egs';
export const official = true;