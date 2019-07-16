const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const jsonminify = window.require('jsonminify');
const {arch} = window.require('os');
const promiseReflect = window.require('promise-reflect');

class Gog {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{7258BA11-600C-430E-A759-27E2C691A335}_is1'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if GOG Galaxy is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getGogPath() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{7258BA11-600C-430E-A759-27E2C691A335}_is1'
            });

            reg.values((err, items) => {
                let gogPath = false;

                items.forEach((item) => {
                    if (item.name === 'InstallLocation') {
                        gogPath = item.value;
                    }
                });

                if (gogPath) {
                    resolve(gogPath);
                } else {
                    reject(new Error('Could not find GOG Galaxy path.'));
                }
            });
        });
    }

    static _processRegKey(key) {
        return new Promise((resolve, reject) => {
            key.get('dependsOn', (err, dependsOn) => {
                if (dependsOn == null) {
                    key.values((err, items) => {
                        let game = {
                            platform: 'gog'
                        };

                        items.forEach((item) => {
                            if (item.name === 'gameID' || item.name === 'GAMEID') {
                                game.id = item.value;
                            }

                            if (item.name === 'gameName' || item.name === 'GAMENAME') {
                                game.name = item.value;
                            }

                            if (item.name === 'exe' || item.name === 'EXE') {
                                game.exe = `"${item.value}"`;
                            }

                            if (item.name === 'launchParam' || item.name === 'LAUNCHPARAM') {
                                game.params = item.value;
                            }

                            if (item.name === 'path' || item.name === 'PATH') {
                                game.startIn = `"${item.value}"`;
                            }
                        });
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
            this.getGogPath().then((gogPath) => {
                let reg = new Registry({
                    hive: Registry.HKLM,
                    arch: 'x86',
                    key:  '\\SOFTWARE\\GOG.com\\Games'
                });

                reg.keys((err, keys) => {
                    let promiseArr = keys.map((key) => {
                        return this._processRegKey(key)
                            .then((res) => {
                                console.log(res);
                                return res;
                            });
                    });
                    Promise.all(promiseArr.map(promiseReflect))
                        .then((results) => {
                            return results.filter((result) => {
                                   return result.status === 'resolved';
                                }).map((result) => {
                                   return result.data;
                                }); 
                        })
                        .then((results) => {
                            console.log(results);
                            resolve(results);
                        });
                });
            });
        });
    }
}

export default Gog;