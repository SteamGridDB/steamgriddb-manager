const Registry = window.require('winreg');
const path = window.require('path');
const promiseReflect = window.require('promise-reflect');

class Bethesda {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{3448917E-E4FE-4E30-9502-9FD52EABB6F5}_is1'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if Bethesda Launcher is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getBethesdaPath() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Bethesda Softworks\\Bethesda.net'
            });

            reg.values((err, items) => {
                if (err) {
                    reject(err);
                }

                let bethesdaPath = false;

                items.forEach((item) => {
                    if (item.name === 'installLocation') {
                        bethesdaPath = item.value;
                    }
                });

                if (bethesdaPath) {
                    resolve(bethesdaPath);
                } else {
                    reject(new Error('Could not find Bethesda Launcher path.'));
                }
            });
        });
    }

    static _processRegKey(key, bethesdaPath) {
        return new Promise((resolve, reject) => {
            key.get('UninstallString', (err, UninstallString) => {
                if (UninstallString != null && UninstallString.value.match(/bethesdanet:\/\/uninstall\//)) {
                    key.values((err, items) => {
                        const game = {
                            platform: 'bethesda'
                        };

                        items.forEach((item) => {
                            if (item.name === 'ProductID') {
                                game.id = parseInt(item.value, 16);
                            }

                            if (item.name === 'DisplayName') {
                                game.name = item.value;
                            }
                        });
                        game.path = `"${bethesdaPath}"`;
                        game.exe = `"${path.join(bethesdaPath, 'BethesdaNetUpdater.exe')}"`;
                        game.params = `bethesdanet://run/${game.id}`;

                        resolve(game);
                    });
                } else {
                    reject(key);
                }
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getBethesdaPath().then((bethesdaPath) => {
                // Loop everything and get ones with bethesdanet://uninstall/ in UninstallString
                // Look for another way cause this is horrible
                const reg = new Registry({
                    hive: Registry.HKLM,
                    arch: 'x86',
                    key:  '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
                });

                reg.keys((err, keys) => {
                    if (err) {
                        reject(new Error('Could not get Bethesda Launcher games.'));
                    }

                    const promiseArr = keys.map((key) => this._processRegKey(key, bethesdaPath).then((res) => res));
                    Promise.all(promiseArr.map(promiseReflect))
                        .then((results) => results.filter((result) => result.status === 'resolved').map((result) => result.data))
                        .then((results) => resolve(results));
                });
            }).catch((err) => reject(err));
        });
    }
}

export default Bethesda;