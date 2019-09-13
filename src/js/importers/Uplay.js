const Registry = window.require('winreg');
const yaml = window.require('js-yaml');
const fs = window.require('fs');
const path = window.require('path');
const log = window.require('electron-log');

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
            if (split[i] === '0a' && split[i-2] !== '08') {
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
                    installDir: installDir.value
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

                if (keys) {
                    const promiseArr = keys.map((key) => this._processRegKey(key).then((res) => res));
                    Promise.all(promiseArr).then((resultsArray) => {
                        const out = {};
                        resultsArray.forEach((item) => {
                            out[String(item.id)] = item.installDir;
                        });
                        return resolve(out);
                    });
                } else {
                    return resolve({});
                }
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

    static resolveConfigPath(value) {
        const hives = {
            'HKEY_LOCAL_MACHINE': 'HKLM',
            'HKEY_CURRENT_USER': 'HKCU',
            'HKEY_CLASSES_ROOT': 'HKCR',
            'HKEY_USERS': 'HKU',
            'HKEY_CURRENT_CONFIG': 'HKCC',
        };
        let output = '';
        return new Promise((resolve) => {
            // Value is stored in registry
            if (value.register) {
                const key = value.register.split('\\');
                const hive = hives[key.shift()];
                const valueName = key.pop();
                const reg = new Registry({
                    hive: hive,
                    arch: 'x86',
                    key: `\\${key.join('\\')}`
                });
                reg.values((err, items) => {
                    if (err) {
                        return resolve(false);
                    }
                    items.forEach((item) => {
                        if (item.name.toLowerCase() === valueName.toLowerCase()) {
                            output += item.value;
                            if (value.append) {
                                output += value.append;
                            }
                            return resolve(output);
                        }
                    });
                });
            } else if (value.relative) {
                return resolve(value.relative);
            }
        });
    }

    static getGameExes(executables, workingDirFallback = false) {
        return new Promise((resolve) => {
            const promises = [];
            executables.forEach((exe) => {
                const promise = new Promise((resolve) => {
                    let append = '';
                    if (exe.working_directory.append) {
                        append = exe.working_directory.append;
                    }
                    this.resolveConfigPath(exe.path).then((exePath) => {
                        if (!exePath) {
                            resolve(false);
                        }

                        // Get working directory
                        this.resolveConfigPath(exe.working_directory).then((workingDir) => {
                            if (workingDir) {
                                // check if exe is actually there
                                if (fs.existsSync(path.join(workingDir, append, exePath))) {
                                    resolve(path.join(workingDir, append, exePath));
                                } else {
                                    resolve(false);
                                }
                            } else {
                                if (workingDirFallback && fs.existsSync(path.join(workingDirFallback, exePath))) {
                                    resolve(path.join(workingDirFallback, exePath));
                                } else if (workingDirFallback && fs.existsSync(path.join(workingDirFallback, append, exePath))) {
                                    resolve(path.join(workingDirFallback, append, exePath));
                                } else {
                                    resolve(false);
                                }
                            }
                        });
                    });
                });
                promises.push(promise);
            });
            Promise.all(promises).then((results) => resolve(results));
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            log.info('Import: Started uplay');
            // Get path to LauncherAutoClose.ps1
            let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
            if (!fs.existsSync(launcherWatcher)) {
                launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
            }
            const powershellExe = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

            this.getUplayPath().then((uplayPath) => {
                this.parseConfig(path.join(uplayPath, 'cache', 'configuration', 'configurations')).then((configItems) => {
                    this._getRegInstalled().then((installedGames) => {
                        // Only need launch IDs
                        const installedGamesIds = Object.keys(installedGames);

                        const games = [];
                        const addGamesPromises = [];
                        const invalidNames = ['NAME', 'GAMENAME', 'l1'];
                        configItems.forEach((game) => {
                            if (game.root.start_game) { // DLC's and other non-games dont have this key
                                // Skip adding games launched via Steam.
                                if (game.root.start_game.steam) {
                                    return;
                                }

                                let gameName = game.root.name;
                                let gameId;

                                // Get name from another key if has weird name assigned
                                if (invalidNames.includes(game.root.name)) {
                                    if (typeof game.root.installer !== 'undefined') {
                                        gameName = game.root.installer.game_identifier;
                                    }

                                    // Override installer name if this value
                                    if (typeof game.root.default[game.root.name] !== 'undefined') {
                                        gameName = game.root.default[game.root.name];
                                    }
                                }

                                if (game.root.space_id) {
                                    gameId = game.root.space_id;
                                } else {
                                    // No space_id means legacy game. Use launch id as ID.
                                    gameId = game.root.launcher_id;
                                }

                                // Only add if launcher id is found in registry and has executables
                                if (installedGamesIds.includes(String(game.root.launcher_id)) && (game.root.start_game.offline || game.root.start_game.online)) {
                                    const addGame = this.getGameExes((game.root.start_game.offline || game.root.start_game.online).executables, installedGames[game.root.launcher_id])
                                        .then((executables) => {
                                            if (executables.every((x) => x !== false)) {
                                                const watchedExes = executables.map((x) => path.parse(path.basename(x)).name);
                                                games.push({
                                                    id: gameId,
                                                    name: gameName,
                                                    exe: `"${powershellExe}"`,
                                                    icon: `"${executables[0]}"`,
                                                    startIn: `"${uplayPath}"`,
                                                    params: `-windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command "& \\"${launcherWatcher}\\" -launcher \\"upc\\" -game \\"${watchedExes.join('\\",\\"')}\\" -launchcmd \\"uplay://launch/${game.root.launcher_id}\\""`,
                                                    platform: 'uplay'
                                                });
                                            } else {
                                                log.info(`Import: uplay - Could not resolve executable for ${gameName}`);
                                            }
                                        });
                                    addGamesPromises.push(addGame);
                                }
                            }
                        });
                        Promise.all(addGamesPromises).then(() => {
                            log.info('Import: Completed uplay');
                            return resolve(games);
                        });
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        });
    }
}

export default Uplay;
export const name = 'Uplay';
export const id = 'uplay';
export const official = true;