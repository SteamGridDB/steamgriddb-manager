const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');

class Uplay {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Uplay'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if Uplay is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getUplayPath() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Ubisoft\\Launcher'
            });

            reg.values((err, items) => {
                let uplayPath = false;

                items.forEach((item) => {
                    if (item.name === 'InstallDir') {
                        uplayPath = item.value;
                    }
                });

                if (uplayPath) {
                    resolve(uplayPath);
                } else {
                    reject(new Error('Could not find Origin path.'));
                }
            });
        });
    }

    static _processRegKey(key, uplayPath) {
        return new Promise((resolve, reject) => {
            let id = path.basename(key.key);
            key.get('InstallDir', (err, installDir) => {
                resolve({
                    id: id,
                    name: path.basename(installDir.value),
                    exe: `"${uplayPath}\\Uplay.exe"`,
                    startIn: `"${uplayPath}"`,
                    params: `uplay://launch/${id}`,
                    platform: 'uplay'
                });
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getUplayPath().then((uplayPath) => {
                let reg = new Registry({
                    hive: Registry.HKLM,
                    arch: 'x86',
                    key:  '\\SOFTWARE\\Ubisoft\\Launcher\\Installs'
                });

                reg.keys((err, keys) => {
                    let promiseArr = keys.map((key) => {
                        return this._processRegKey(key, uplayPath)
                            .then((res) => {
                                return res;
                            });
                    });
                    Promise.all(promiseArr).then((resultsArray) => {
                        resolve(resultsArray);
                    });
                });
            });
        });
    }
}

export default Uplay;