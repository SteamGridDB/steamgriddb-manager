const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const jsonminify = window.require('jsonminify');
const {arch} = window.require('os');

class Epic {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{AAA3417F-FEAD-4AF7-9C01-9FAE1BB44E3D}'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if Epic Games Launcher is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getEpicPath() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{AAA3417F-FEAD-4AF7-9C01-9FAE1BB44E3D}'
            });

            reg.values((err, items) => {
                let epicPath = false;

                items.forEach((item) => {
                    if (item.name === 'InstallLocation') {
                        epicPath = item.value;
                    }
                });

                if (epicPath) {
                    resolve(epicPath);
                } else {
                    reject(new Error('Could not find Epic Games Launcher path.'));
                }
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getEpicPath().then((epicPath) => {
                let games = [];
                let binFolder;
                if (arch == 'ia32') {
                    binFolder = 'Win32';
                } else if (arch == 'x64') {
                    binFolder = 'Win64';
                }
                let binaryPath = path.join(epicPath, 'Launcher', 'Portal', 'Binaries', binFolder);
                const launcherData = 'C:\\ProgramData\\Epic\\UnrealEngineLauncher\\LauncherInstalled.dat';
                if (fs.existsSync(launcherData)) {
                    let launcherDataStr = fs.readFileSync(launcherData).toString();
                    let parsed = JSON.parse(jsonminify(launcherDataStr));
                    parsed.InstallationList.forEach((game) => {
                        games.push({
                            id: game.AppName,
                            name: path.basename(game.InstallLocation),
                            exe: `"${path.join(binaryPath, 'EpicGamesLauncher.exe')}"`,
                            startIn: `"${binaryPath}"`,
                            params: `com.epicgames.launcher://apps/${game.AppName}?action=launch&silent=true`,
                            platform: 'egs'
                        });
                    });
                    resolve(games);
                } else {
                    reject('Could not find Epic Games Launcher data.');
                }
            }).catch((err) => reject(err));
        });
    }
}

export default Epic;