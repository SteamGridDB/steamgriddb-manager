const Registry = window.require('winreg');
const Store = window.require('electron-store');
const fs = window.require('fs');
const {join} = window.require('path');
const VDF = window.require('@node-steam/vdf');
const shortcut = window.require('steam-shortcut-editor');
const https = window.require('https');
const Stream = window.require('stream').Transform;
const metrohash64 = window.require('metrohash').metrohash64;
import SteamID from 'steamid';
import {crc32} from 'crc';

class Steam {
    constructor() {
        this.steamPath = null;
        this.loggedInUser = null;
        this.currentUserGridPath = null;
    }

    static getSteamPath() {
        return new Promise((resolve, reject) => {
            if (this.steamPath) {
                return resolve(this.steamPath);
            }

            const key = new Registry({
                hive: Registry.HKCU,
                key:  '\\Software\\Valve\\Steam'
            });

            key.values((err, items) => {
                let steamPath = false;

                items.forEach((item) => {
                    if (item.name === 'SteamPath') {
                        steamPath = item.value;
                    }
                });

                if (steamPath) {
                    this.steamPath = steamPath;
                    resolve(steamPath);
                } else {
                    reject(new Error('Could not find Steam path.'));
                }
            });
        });
    }

    static getCurrentUserGridPath() {
        return new Promise((resolve) => {
            if (this.currentUserGridPath) {
                return resolve(this.currentUserGridPath);
            }
            this.getSteamPath().then((steamPath) => {
                this.getLoggedInUser().then((user) => {
                    const gridPath = join(steamPath, 'userdata', String(user), 'config', 'grid');
                    this.currentUserGridPath = gridPath;
                    resolve(gridPath);
                });
            });
        });
    }

    static getUsers() {
        return new Promise((resolve) => {
            this.getSteamPath().then((steamPath) => {
                const users = [];
                const userdataPath = join(steamPath, 'userdata');

                const files = fs.readdirSync(userdataPath).filter((file) => fs.statSync(join(userdataPath, file)).isDirectory());

                files.forEach((file) => {
                    const userID = file;
                    const userPath = join(userdataPath, file);
                    const configFile = join(userPath, 'config', 'localconfig.vdf');

                    // Make sure the config file is there
                    try {
                        fs.statSync(configFile);
                    } catch(e) {
                        return;
                    }

                    const data = fs.readFileSync(configFile, 'utf-8');
                    const userData = VDF.parse(data);
                    const username = userData.UserLocalConfigStore.friends.PersonaName;

                    users.push({
                        Name: username,
                        SteamID3: userID,
                        SteamID64: (new SteamID(userID)).getSteamID64(),
                        Dir: userdataPath
                    });
                });

                resolve(users);
            });
        });
    }

    static getSteamGames() {
        return new Promise((resolve) => {
            this.getSteamPath().then((steamPath) => {
                this.getCurrentUserGridPath().then((userdataPath) => {
                    const parsedLibFolders = VDF.parse(fs.readFileSync(join(steamPath, 'steamapps', 'libraryfolders.vdf'), 'utf-8'));
                    const games = [];
                    const libraries = [];

                    // Add Steam install dir
                    libraries.push(steamPath);

                    // Add library folders from libraryfolders.vdf
                    Object.keys(parsedLibFolders.LibraryFolders).forEach((key) => {
                        const library = parsedLibFolders.LibraryFolders[key];
                        if (!isNaN(key)) {
                            libraries.push(library);
                        }
                    });

                    libraries.forEach((library) => {
                        const appsPath = join(library, 'steamapps');
                        const files = fs.readdirSync(appsPath);
                        files.forEach((file) => {
                            const ext = file.split('.').pop();

                            if (ext === 'acf') {
                                const filePath = join(appsPath, file);
                                const data = fs.readFileSync(filePath, 'utf-8');
                                const gameData = VDF.parse(data);

                                if (gameData.AppState.appid === 228980) {
                                    return;
                                }

                                let image = this.getCustomGridImage(userdataPath, gameData.AppState.appid);

                                if (!image) {
                                    image = this.getDefaultGridImage(gameData.AppState.appid);
                                }

                                games.push({
                                    appid: gameData.AppState.appid,
                                    name: gameData.AppState.name,
                                    image: image,
                                    imageURI: image,
                                    type: 'game'
                                });
                            }
                        });
                    });

                    resolve(games);
                });
            });
        });
    }

    static getNonSteamGames() {
        return new Promise((resolve) => {
            this.getSteamPath().then((steamPath) => {
                this.getLoggedInUser().then((user) => {
                    const store = new Store();
                    const userdataPath = join(steamPath, 'userdata', String(user));
                    const userdataGridPath = join(userdataPath, 'config', 'grid');
                    const shortcutPath = join(userdataPath, 'config', 'shortcuts.vdf');
                    shortcut.parseFile(shortcutPath, (err, items) => {
                        const games = {
                            'other': []
                        };

                        if (!items) {
                            return resolve([]);
                        }

                        items.shortcuts.forEach((item) => {
                            const appName = item.appname || item.AppName;
                            const exe = item.exe || item.Exe;
                            const appid = this.generateAppId(exe, appName);
                            const image = this.getCustomGridImage(userdataGridPath, appid);
                            let imageURI = false;
                            if (image) {
                                imageURI = `file://${image.replace(/ /g, '%20')}`;
                            }

                            const configId = metrohash64(exe+item.LaunchOptions);
                            if (store.has(`games.${configId}`)) {
                                const storedGame = store.get(`games.${configId}`);
                                if (typeof games[storedGame.platform] == 'undefined') {
                                    games[storedGame.platform] = [];
                                }

                                games[storedGame.platform].push({
                                    gameId: storedGame.id,
                                    appid: appid,
                                    name: appName,
                                    platform: storedGame.platform,
                                    image: image,
                                    imageURI: imageURI,
                                    type: 'shortcut'
                                });
                            } else {
                                games['other'].push({
                                    gameId: null,
                                    appid: appid,
                                    name: appName,
                                    platform: 'other',
                                    image: image,
                                    imageURI: imageURI,
                                    type: 'shortcut'
                                });
                            }
                        });
                        resolve(games);
                    });
                });
            });
        });
    }

    static generateAppId(exe, name) {
        const key = exe + name;
        const top = BigInt(crc32(key)) | BigInt(0x80000000);
        return String((BigInt(top) << BigInt(32) | BigInt(0x02000000)));
    }

    static getLoggedInUser() {
        return new Promise((resolve) => {
            if (this.loggedInUser) {
                return resolve(this.loggedInUser);
            }

            this.getSteamPath().then((steamPath) => {
                const loginusersPath = join(steamPath, 'config', 'loginusers.vdf');
                const data = fs.readFileSync(loginusersPath, 'utf-8');
                const loginusersData = VDF.parse(data);

                for (const user in loginusersData.users) {
                    if (loginusersData.users[user].mostrecent) {
                        const accountid = (new SteamID(user)).accountid;
                        this.loggedInUser = accountid;
                        resolve(accountid);
                    }
                }
            });
        });
    }

    static getDefaultGridImage(appid) {
        return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`;
    }

    static getCustomGridImage(userdataGridPath, appid) {
        const fileTypes = ['jpg', 'jpeg', 'png', 'tga'];
        const basePath = join(userdataGridPath, String(appid));
        let image = false;

        fileTypes.some((ext) => {
            const path = `${basePath}.${ext}`;

            if (fs.existsSync(path)) {
                image = path;
                return true;
            }
        });

        return image;
    }

    static deleteCustomGridImage(userdataGridPath, appid) {
        const imagePath = this.getCustomGridImage(userdataGridPath, appid);
        if (imagePath) {
            fs.unlinkSync(imagePath);
        }
    }

    static getShortcutFile() {
        return new Promise((resolve) => {
            this.getSteamPath().then((steamPath) => {
                this.getLoggedInUser().then((user) => {
                    const userdataPath = join(steamPath, 'userdata', String(user));
                    const shortcutPath = join(userdataPath, 'config', 'shortcuts.vdf');
                    resolve(shortcutPath);
                });
            });
        });
    }

    static addGrid(appId, url, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            this.getCurrentUserGridPath().then((userGridPath) => {
                const image_url = url;
                const image_ext = image_url.substr(image_url.lastIndexOf('.') + 1);
                const dest = join(userGridPath, `${appId}.${image_ext}`);

                let cur = 0;
                const data = new Stream();
                let progress = 0;
                let lastProgress = 0;
                https.get(url, (response) => {
                    const len = parseInt(response.headers['content-length'], 10);

                    response.on('end', () => {
                        this.deleteCustomGridImage(userGridPath, appId);
                        fs.writeFileSync(dest, data.read());
                        resolve(dest);
                    });

                    response.on('data', (chunk) => {
                        cur += chunk.length;
                        data.push(chunk);
                        progress = Math.round((cur / len) * 10) / 10;
                        if (progress !== lastProgress) {
                            lastProgress = progress;
                            onProgress(progress);
                        }
                    });
                }).on('error', (err) => {
                    fs.unlink(dest);
                    reject(err);
                });
            });
        });
    }

    static addShortcuts(shortcuts) {
        return new Promise((resolve) => {
            this.getShortcutFile().then((shortcutPath) => {
                shortcut.parseFile(shortcutPath, (err, items) => {
                    const newShorcuts = {
                        'shortcuts': []
                    };

                    let apps = [];
                    if (typeof items != 'undefined') {
                        apps = items.shortcuts;
                    }

                    shortcuts.forEach((value) => {
                        // Don't add dupes
                        for (let i = 0; i < apps.length; i++) {
                            const app = apps[i];
                            const appid = this.generateAppId(app.exe, app.appname);
                            if (this.generateAppId(value.exe, value.name) === appid) {
                                return resolve();
                            }
                        }

                        apps.push({
                            'appname': value.name,
                            'exe': value.exe,
                            'StartDir': value.startIn,
                            'LaunchOptions': value.params,
                            'icon': (typeof value.icon !== 'undefined' ? value.icon : ''),
                            'IsHidden': false,
                            'ShortcutPath': '',
                            'AllowDesktopConfig': true,
                            'OpenVR': false,
                            'tags': (typeof value.tags !== 'undefined' ? value.tags : [])
                        });
                    });

                    newShorcuts.shortcuts = apps;

                    shortcut.writeFile(shortcutPath, newShorcuts, () => resolve());
                });
            });
        });
    }

    static removeShortcut(name, executable) {
        return new Promise((resolve) => {
            this.getShortcutFile().then((shortcutPath) => {
                shortcut.parseFile(shortcutPath, (err, items) => {
                    const newShorcuts = {
                        'shortcuts': []
                    };

                    let apps = [];
                    if (typeof items != 'undefined') {
                        apps = items.shortcuts;
                    }

                    for (let i = 0; i < apps.length; i++) {
                        const app = apps[i];
                        const appid = this.generateAppId(app.exe, app.appname);
                        if (this.generateAppId(executable, name) === appid) {
                            apps.splice(i, 1);
                            break;
                        }
                    }

                    newShorcuts.shortcuts = apps;
                    shortcut.writeFile(shortcutPath, newShorcuts, () => resolve());
                });
            });
        });
    }
}

export default Steam;