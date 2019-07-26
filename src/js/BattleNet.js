const electron = window.require('electron');
const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
import decoder from 'blizzard-product-parser/src/js/database'; // Workaround for badly configured lib

class BattleNet {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if the Battle.net is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getBattlenetPath() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net'
            });

            reg.values((err, items) => {
                let bnetPath = false;
                items.forEach((item) => {
                    if (item.name === 'InstallLocation') {
                        bnetPath = item.value;
                    }
                });

                if (bnetPath) {
                    resolve(bnetPath);
                } else {
                    reject(new Error('Could not Battle.net path.'));
                }
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getBattlenetPath().then((bnetPath) => {
                const games = [];
                const executable = path.join(bnetPath, 'Battle.net.exe');
                let appData = (electron.app || electron.remote.app).getPath('userData');
                appData = path.join(appData.replace(path.basename(appData), ''), 'Battle.net');

                // Get latest .config file
                const files = fs.readdirSync(appData).filter((files) => !(files === 'Battle.net.config' || !files.includes('.config')));
                const latest = files.reduce((prev, current) => {
                    const prevFile = fs.statSync(path.join(appData, prev)).mtimeMs;
                    const currentFile = fs.statSync(path.join(appData, current)).mtimeMs;
                    return (prevFile.mtimeMs > currentFile.mtimeMs) ? prev : current;
                });

                // Parse config file as JSON
                const config = JSON.parse(fs.readFileSync(path.join(appData, latest)).toString());
                const gameIds = {};

                // Map correct case id to lower case key
                Object.keys(config.User.Client.PlayScreen.GameFamily).forEach((id) => {
                    gameIds[id.toLowerCase()] = id;
                });

                try {
                    const decoded = decoder.decode(fs.readFileSync('C:\\ProgramData\\Battle.net\\Agent\\product.db'));
                    const installed = decoded.productInstall.filter((product) => !(product.uid === 'battle.net' || product.uid === 'agent')); // Filter out non-games

                    installed.forEach((product) => {
                        const gameId = product.uid;
                        let launchId = product.productCode; // Lowercase, find correct case by matching with .config file
                        launchId = gameIds[launchId.toLowerCase()];

                        const name = path.basename(product.settings.installPath);

                        games.push({
                            id: gameId,
                            name: name,
                            exe: `"${executable}"`,
                            startIn: `"${bnetPath}"`,
                            params: `--exec="launch ${launchId}"`,
                            platform: 'bnet'
                        });
                    });
                    resolve(games);
                } catch(err) {
                    reject(err);
                }
            }).catch((err) => reject(err));
        });
    }
}

export default BattleNet;