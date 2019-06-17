const Registry = window.require('winreg');
const fs = window.require('fs');
const {join} = window.require('path')
const VDF = window.require('@node-steam/vdf');
const shortcut = window.require('steam-shortcut-editor');
import SteamID from 'steamid';
import {crc32} from 'crc';

class Steam {
    static getSteamPath() {
        return new Promise((resolve, reject) => {
            let key = new Registry({
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
                    resolve(steamPath);
                } else {
                    // @todo We need to check this at app start and show a giant error if it happens because nothing about this app will work without finding Steam
                    reject(new Error('Could not find Steam path.'));
                }
            });
        });
    }

    static getCurrentUserGridPath() {
        return new Promise((resolve, reject) => {
            this.getSteamPath().then((steamPath) => {
                this.getLoggedInUser().then((user) => {
                    let userdataPath = join(steamPath, 'userdata', user + "", "config", "grid");
                    resolve(userdataPath);
                });
            });
        });
    }

    static getUsers() {
        return new Promise((resolve, reject) => {
            this.getSteamPath().then((steamPath) => {
                let users = [];
                let userdataPath = join(steamPath, 'userdata');

                let files = fs.readdirSync(userdataPath).filter(file => fs.statSync(join(userdataPath, file)).isDirectory());

                files.forEach((file) => {
                    let userID = file;
                    let userPath = join(userdataPath, file);
                    let configFile = join(userPath, 'config', 'localconfig.vdf');

                    // Make sure the config file is there
                    try {
                        fs.statSync(configFile);
                    } catch(e) {
                        return;
                    }

                    doAThing(() => {
                        // this is still the Steam class
                    })

                    doAThing(function(){
                        // this is the callback function getting passed into doAThing()
                    })

                    let data = fs.readFileSync(configFile, 'utf-8');
                    let userData = VDF.parse(data);
                    let username = userData.UserLocalConfigStore.friends.PersonaName

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
        return new Promise((resolve, reject) => {
            this.getSteamPath().then((steamPath) => {
                this.getCurrentUserGridPath().then((userdataPath) => {
                    let appsPath = join(steamPath, 'steamapps');
                    let files = fs.readdirSync(appsPath);
                    let games = [];

                    // files.forEach(function(file){
                    files.forEach((file) => {
                        let ext = file.split('.').pop();

                        if (ext === 'acf') {
                            let filePath = join(appsPath, file);
                            let data = fs.readFileSync(filePath, 'utf-8');
                            let gameData = VDF.parse(data);

                            if (gameData.AppState.appid === 228980) {
                                return;
                            }

                            let image = this.getCustomGridImage(userdataPath, gameData.AppState.appid);

                            try {
                                // @todo We are checking this in getCustomGridIamge now, so no need to do it here
                                if (!fs.existsSync(image)) {
                                    image = this.getDefaultGridImage(gameData.AppState.appid);
                                }
                            } catch(err) {
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

                    resolve(games);
                });
            });
        });
    }

    static getNonSteamGames(user) {
        return new Promise((resolve, reject) => {
            this.getSteamPath().then((steamPath) => {
                this.getLoggedInUser().then((user) => {
                    let userdataPath = join(steamPath, 'userdata', String(user));
                    let userdataGridPath = join(userdataPath, 'config', 'grid');
                    let shortcutPath = join(userdataPath, 'config', 'shortcuts.vdf');
                    shortcut.parseFile(shortcutPath, (err, items) => {
                        let games = [];

                        items.shortcuts.forEach((item) => {
                            let appid = this.generateAppId(item.Exe, item.AppName);
                            let image = this.getCustomGridImage(userdataGridPath, appid);
                            let imageURI = false;

                            if (image) {
                                imageURI = "file://" + image.replace(' ', '%20');
                            }

                            games.push({
                                appid: appid,
                                name: item.AppName,
                                image: image,
                                imageURI: imageURI,
                                type: 'shortcut'
                            });
                        });

                        resolve(games);
                    });
                });
            });
        });
    }

    static generateAppId(exe, name) {
        let key = exe + name;
        let top = BigInt(crc32(key)) | BigInt(0x80000000);
        return (BigInt(top) << BigInt(32) | BigInt(0x02000000)) + "";
    }

    static getLoggedInUser() {
        return new Promise((resolve, reject) => {
            this.getSteamPath().then((steamPath) => {
                let loginusersPath = join(steamPath, 'config', 'loginusers.vdf');
                let data = fs.readFileSync(loginusersPath, 'utf-8');
                let loginusersData = VDF.parse(data);

                for (let user in loginusersData.users) {
                    if (loginusersData.users[user].mostrecent) {
                        let accountid = (new SteamID(user)).accountid;

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
        let fileTypes = ['jpg', 'jpeg', 'png', 'tga'];
        let basePath = join(userdataGridPath, String(appid));
        let image = false;

        fileTypes.some((ext) => {
            let path = `${basePath}.${ext}`;

            if (fs.existsSync(path)) {
                image = path;
                return true;
            }
        })

        return image;
    }

    static deleteCustomGridImage(userdataGridPath, appid) {
        let imagePath = this.getCustomGridImage(userdataGridPath, appid);
        if (imagePath) {
            fs.unlinkSync(imagePath);
        }
    }
}

export default Steam;