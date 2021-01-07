import SteamID from 'steamid';
import { crc32 } from 'crc';

const Registry = window.require('winreg');
const Store = window.require('electron-store');
const fs = window.require('fs');
const { join, extname } = window.require('path');
const VDF = window.require('@node-steam/vdf');
const shortcut = window.require('steam-shortcut-editor');
const https = window.require('https');
const Stream = window.require('stream').Transform;
const { metrohash64 } = window.require('metrohash');
const log = window.require('electron-log');
const Categories = window.require('steam-categories');
const glob = window.require('glob');

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
        key: '\\Software\\Valve\\Steam',
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
          log.info(`Got Steam path: ${steamPath}`);
          return resolve(steamPath);
        }

        return reject(new Error('Could not find Steam path.'));
      });

      return false;
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
          if (!fs.existsSync(gridPath)) {
            fs.mkdirSync(gridPath);
          }
          this.currentUserGridPath = gridPath;
          resolve(gridPath);
        });
      });
      return false;
    });
  }

  static getSteamGames() {
    return new Promise((resolve) => {
      this.getSteamPath().then((steamPath) => {
        const parsedLibFolders = VDF.parse(fs.readFileSync(join(steamPath, 'steamapps', 'libraryfolders.vdf'), 'utf-8'));
        const games = [];
        const libraries = [];

        // Add Steam install dir
        libraries.push(steamPath);

        // Add library folders from libraryfolders.vdf
        Object.keys(parsedLibFolders.LibraryFolders).forEach((key) => {
          const library = parsedLibFolders.LibraryFolders[key];
          if (!Number.isNaN(parseInt(key, 10))) {
            libraries.push(library);
          }
        });

        log.info(`Found ${libraries.length} Steam libraries`);

        libraries.forEach((library) => {
          const appsPath = join(library, 'steamapps');
          const files = fs.readdirSync(appsPath);
          files.forEach((file) => {
            const ext = file.split('.').pop();

            if (ext === 'acf') {
              const filePath = join(appsPath, file);
              const data = fs.readFileSync(filePath, 'utf-8');
              try {
                const gameData = VDF.parse(data);
                if (gameData.AppState.appid === 228980) {
                  return;
                }

                games.push({
                  appid: gameData.AppState.appid,
                  name: gameData.AppState.name,
                  type: 'game',
                });
              } catch (err) {
                log.warn(`Error while parsing ${file}: ${err}`);
              }
            }
          });
        });
        log.info(`Fetched ${games.length} Steam games`);

        resolve(games);
      });
    });
  }

  static getNonSteamGames() {
    return new Promise((resolve) => {
      this.getSteamPath().then((steamPath) => {
        this.getLoggedInUser().then((user) => {
          const store = new Store();
          const userdataPath = join(steamPath, 'userdata', String(user));
          const shortcutPath = join(userdataPath, 'config', 'shortcuts.vdf');
          const processed = [];
          shortcut.parseFile(shortcutPath, (err, items) => {
            const games = {};

            if (!items) {
              return resolve([]);
            }

            items.shortcuts.forEach((item) => {
              const appName = item.appname || item.AppName || item.appName;
              const exe = item.exe || item.Exe;
              const appid = this.generateNewAppId(exe, appName);

              const configId = metrohash64(exe + item.LaunchOptions);
              if (store.has(`games.${configId}`)) {
                const storedGame = store.get(`games.${configId}`);
                if (typeof games[storedGame.platform] === 'undefined') {
                  games[storedGame.platform] = [];
                }

                if (!processed.includes(configId)) {
                  games[storedGame.platform].push({
                    gameId: storedGame.id,
                    name: appName,
                    platform: storedGame.platform,
                    type: 'shortcut',
                    appid,
                  });
                  processed.push(configId);
                }
              } else {
                if (!games.other) {
                  games.other = [];
                }

                games.other.push({
                  gameId: null,
                  name: appName,
                  platform: 'other',
                  type: 'shortcut',
                  appid,
                });
              }
            });
            return resolve(games);
          });
        });
      });
    });
  }

  /* eslint-disable no-bitwise, no-mixed-operators */
  static generateAppId(exe, name) {
    const key = exe + name;
    const top = BigInt(crc32(key)) | BigInt(0x80000000);
    return String((BigInt(top) << BigInt(32) | BigInt(0x02000000)));
  }

  // Appid for new library.
  // Thanks to https://gist.github.com/stormyninja/6295d5e6c1c9c19ab0ce46d546e6d0b1 & https://gitlab.com/avalonparton/grid-beautification
  static generateNewAppId(exe, name) {
    const key = exe + name;
    const top = BigInt(crc32(key)) | BigInt(0x80000000);
    const shift = (BigInt(top) << BigInt(32) | BigInt(0x02000000)) >> BigInt(32);
    return parseInt(shift, 10);
  }
  /* eslint-enable no-bitwise, no-mixed-operators */

  static getLoggedInUser() {
    return new Promise((resolve) => {
      if (this.loggedInUser) {
        return resolve(this.loggedInUser);
      }

      this.getSteamPath().then((steamPath) => {
        const loginusersPath = join(steamPath, 'config', 'loginusers.vdf');
        const data = fs.readFileSync(loginusersPath, 'utf-8');
        const loginusersData = VDF.parse(data);

        Object.keys(loginusersData.users).forEach((user) => {
          if (loginusersData.users[user].MostRecent || loginusersData.users[user].mostrecent) {
            const { accountid } = (new SteamID(user));
            this.loggedInUser = accountid;
            log.info(`Got Steam user: ${accountid}`);
            resolve(accountid);
            return true;
          }
          return false;
        });
      });

      return false;
    });
  }

  static getDefaultGridImage(appid) {
    return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`;
  }

  static getCustomImage(type, userdataGridPath, appid) {
    const fileTypes = ['png', 'jpg', 'jpeg', 'tga'];

    let basePath;
    switch (type) {
    case 'horizontalGrid':
      basePath = join(userdataGridPath, `${String(appid)}`);
      break;
    case 'verticalGrid':
      basePath = join(userdataGridPath, `${String(appid)}p`);
      break;
    case 'hero':
      basePath = join(userdataGridPath, `${String(appid)}_hero`);
      break;
    case 'logo':
      basePath = join(userdataGridPath, `${String(appid)}_logo`);
      break;
    default:
      basePath = join(userdataGridPath, `${String(appid)}`);
    }

    let image = false;
    fileTypes.some((ext) => {
      const path = `${basePath}.${ext}`;

      if (fs.existsSync(path)) {
        image = path;
        return true;
      }
      return false;
    });

    return image;
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

  static addAsset(type, appId, url) {
    return new Promise((resolve, reject) => {
      this.getCurrentUserGridPath().then((userGridPath) => {
        const imageUrl = url;
        const imageExt = extname(imageUrl);

        let dest;

        switch (type) {
        case 'horizontalGrid':
          dest = join(userGridPath, `${appId}${imageExt}`);
          break;
        case 'verticalGrid':
          dest = join(userGridPath, `${appId}p${imageExt}`);
          break;
        case 'hero':
          dest = join(userGridPath, `${appId}_hero${imageExt}`);
          break;
        default:
          reject();
        }

        let cur = 0;
        const data = new Stream();
        let progress = 0;
        let lastProgress = 0;
        https.get(url, (response) => {
          const len = parseInt(response.headers['content-length'], 10);

          response.on('data', (chunk) => {
            cur += chunk.length;
            data.push(chunk);
            progress = Math.round((cur / len) * 10) / 10;
            if (progress !== lastProgress) {
              lastProgress = progress;
            }
          });

          response.on('end', () => {
            // Delete old image(s)
            glob.sync(`${dest.replace(imageExt, '')}.*`).map((file) => {
              fs.unlinkSync(file);
            });
            fs.writeFileSync(dest, data.read());
            resolve(dest);
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
            shortcuts: [],
          };

          let apps = [];
          if (typeof items !== 'undefined') {
            apps = items.shortcuts;
          }

          shortcuts.forEach((value) => {
            // Don't add dupes
            apps.some((app) => {
              const appid = this.generateAppId(app.exe, app.appname);
              if (this.generateAppId(value.exe, value.name) === appid) {
                return true;
              }
              return false;
            });

            apps.push({
              appname: value.name,
              exe: value.exe,
              StartDir: value.startIn,
              LaunchOptions: value.params,
              icon: (typeof value.icon !== 'undefined' ? value.icon : ''),
              IsHidden: false,
              ShortcutPath: '',
              AllowDesktopConfig: true,
              OpenVR: false,
              tags: (typeof value.tags !== 'undefined' ? value.tags : []),
            });
          });

          newShorcuts.shortcuts = apps;

          shortcut.writeFile(shortcutPath, newShorcuts, () => resolve());
        });
      });
    });
  }

  static addCategory(games, categoryId) {
    return new Promise((resolve, reject) => {
      const levelDBPath = join(process.env.localappdata, 'Steam', 'htmlcache', 'Local Storage', 'leveldb');
      this.getLoggedInUser().then((user) => {
        const cats = new Categories(levelDBPath, String(user));
        cats.read().then(() => {
          this.getCurrentUserGridPath().then((userGridPath) => {
            const localConfigPath = join(userGridPath, '../', 'localconfig.vdf');
            const localConfig = VDF.parse(fs.readFileSync(localConfigPath, 'utf-8'));

            let collections = {};
            if (localConfig.UserLocalConfigStore.WebStorage['user-collections']) {
              collections = JSON.parse(localConfig.UserLocalConfigStore.WebStorage['user-collections'].replace(/\\/g, ''));
            }

            games.forEach((app) => {
              const platformName = categoryId;
              const appId = this.generateNewAppId(app.exe, app.name);

              // Create new category if it doesn't exist
              const catKey = `sgdb-${platformName}`; // just use the name as the id
              const platformCat = cats.get(catKey);
              if (platformCat.is_deleted || !platformCat) {
                cats.add(catKey, {
                  name: platformName,
                  added: [],
                });
              }

              // Create entry in localconfig.vdf
              if (!collections[catKey]) {
                collections[catKey] = {
                  id: catKey,
                  added: [],
                  removed: [],
                };
              }

              // Add appids to localconfig.vdf
              if (collections[catKey].added.indexOf(appId) === -1) {
                // Only add if it doesn't exist already
                collections[catKey].added.push(appId);
              }
            });

            cats.save().then(() => {
              localConfig.UserLocalConfigStore.WebStorage['user-collections'] = JSON.stringify(collections).replace(/"/g, '\\"'); // I hate Steam

              const newVDF = VDF.stringify(localConfig);
              fs.writeFileSync(localConfigPath, newVDF);
              cats.close();
              return resolve();
            });
          });
        }).catch((err) => {
          reject(err);
        });
      });
    });
  }
}

export default Steam;
