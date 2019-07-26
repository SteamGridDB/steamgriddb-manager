const Registry = window.require('winreg');
const yaml = window.require('js-yaml');
const fs = window.require('fs');
const path = window.require('path');

class Uplay {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
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
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Ubisoft\\Launcher'
            });

            reg.values((err, items) => {
                if (err) {
                    reject(err);
                }

                let uplayPath = false;

                items.forEach((item) => {
                    if (item.name === 'InstallDir') {
                        uplayPath = item.value;
                    }
                });

                if (uplayPath) {
                    resolve(uplayPath);
                } else {
                    reject(new Error('Could not find Uplay path.'));
                }
            });
        });
    }

    static parseConfig(config) {
        return new Promise((resolve, reject) => {
            const configFile = fs.readFileSync(config, 'hex');

            const finalOutput = [];
            let game = ['root:'];
            let launcherId = null;
            this._generateHexArr(configFile).forEach((hexStr) => {
                const line = Buffer.from(hexStr, 'hex').toString('utf8').replace(/\n/g, '');

                const foundId = hexStr.match(/08([0-9a-f]+)10[0-9a-f]+1a/);
                if (foundId) {
                    if (game.length === 1) {
                        const hexChars = foundId[1].match(/.{1,2}/g);
                        const ints = hexChars.map((x) => parseInt(x, 16));
                        launcherId = this._convertLaunchId(ints);
                        return;
                    } else if (game.length > 1) {
                        try {
                            const gameParsed = yaml.load(game.join('\n'));

                            if (launcherId) {
                                gameParsed.root.launcher_id = launcherId;
                            }
                            finalOutput.push(gameParsed);
                        } catch (e) {
                            reject('Could not parse YAML');
                        }

                        const hexChars = foundId[1].match(/.{1,2}/g);
                        const ints = hexChars.map((x) => parseInt(x, 16));
                        launcherId = this._convertLaunchId(ints);
                        game = ['root:'];
                        return;
                    }
                }

                // Already manually saved "root:"
                if (line.trim().includes('root:') && !line.trim().includes('_')) {
                    return;
                }

                // Save lines if starts with spaces
                if (line.substr(0, 2) == '  ' && !line.includes('sort_string:')) {
                    game.push(line);
                }
            });
            resolve(finalOutput);
        });
    }

    static _generateHexArr(str) {
        const lines = [];
        const split = str.match(/.{1,2}/g);
        let line = '';
        for (let i = 0; i < split.length; i++) {
            line = line+split[i];
            if (split[i] === '0a') {
                lines.push(line);
                line = '';
            }
        }
        return lines;
    }

    static _processRegKey(key) {
        return new Promise((resolve) => {
            const id = path.basename(key.key);
            key.get('InstallDir', (err, installDir) => {
                resolve({
                    id: id,
                    InstallDir: installDir.value
                });
            });
        });
    }

    static _getRegInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Ubisoft\\Launcher\\Installs'
            });
            reg.keys((err, keys) => {
                if (err) {
                    reject(err);
                }

                const promiseArr = keys.map((key) => this._processRegKey(key).then((res) => res));
                Promise.all(promiseArr).then((resultsArray) => resolve(resultsArray));
            });
        });
    }

    static _convertLaunchId(hexArr) {
        let launchId = 0;
        let multiplier = 1;
        for (let i = 0; i < hexArr.length; i++, multiplier = multiplier*256) {
            if (hexArr[i] === 16) {
                break;
            }
            launchId = launchId + (hexArr[i] * multiplier);
        }

        if (launchId > 256 * 256) {
            launchId = launchId - (128 * 256 * Math.ceil(launchId / (256 * 256)));
            launchId = launchId - (128 * Math.ceil(launchId / 256));
        } else if (launchId > 256) {
            launchId = launchId - (128 * Math.ceil(launchId / 256));
        }
        return launchId;
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getUplayPath().then((uplayPath) => {
                this.parseConfig(path.join(uplayPath, 'cache', 'configuration', 'configurations')).then((configItems) => {
                    this._getRegInstalled().then((installedGames) => {
                        // Only need launch IDs
                        installedGames = installedGames.map((game) => String(game.id));

                        const games = [];
                        const invalidNames = ['NAME', 'GAMENAME', 'l1'];
                        configItems.forEach((game) => {
                            if (game.root.start_game) { // DLC's and other stuff dont have this key
                                let gameName = game.root.name;
                                let gameId;

                                // Get name from another key if has weird name assigned
                                if (invalidNames.includes(game.root.name)) {
                                    if (typeof game.root.installer !== 'undefined') {
                                        gameName = game.root.installer.game_identifier;
                                    } else {
                                        gameName = game.root.default[game.root.name];
                                    }
                                }

                                if (game.root.space_id) {
                                    gameId = game.root.space_id;
                                } else {
                                    // No space_id means legacy game. Use launch id as ID.
                                    gameId = game.root.launcher_id;
                                }

                                // Only add if launcher id is found in registry
                                if (installedGames.includes(String(game.root.launcher_id))) {
                                    games.push({
                                        id: gameId,
                                        name: gameName,
                                        exe: `"${path.join(uplayPath, 'Uplay.exe')}"`,
                                        startIn: `"${uplayPath}"`,
                                        params: `uplay://launch/${game.root.launcher_id}`,
                                        platform: 'uplay'
                                    });
                                }
                            }
                        });

                        resolve(games);
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        });
    }
}

export default Uplay;