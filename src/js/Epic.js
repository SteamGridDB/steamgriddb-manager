const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const jsonminify = window.require('jsonminify');
const {arch} = window.require('os');

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
            this.getEpicPath().then((epicPath) => {
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
                    return reject('Could not find Epic Games Launcher data.');
                }

                fs.readdirSync(manifestsDir).forEach((file) => {
                    if (path.extname(file) === '.item') {
                        const launcherDataStr = fs.readFileSync(path.join(manifestsDir, file)).toString();
                        const parsed = JSON.parse(jsonminify(launcherDataStr));
                        games.push({
                            id: parsed.AppName,
                            name: parsed.DisplayName,
                            exe: `"${path.join(binaryPath, 'EpicGamesLauncher.exe')}"`,
                            startIn: `"${binaryPath}"`,
                            params: `com.epicgames.launcher://apps/${parsed.AppName}?action=launch&silent=true`,
                            platform: 'egs'
                        });
                    }
                });
                resolve(games);
            }).catch((err) => reject(err));
        });
    }
}

export default Epic;