const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const log = window.require('electron-log');
import decoder from 'blizzard-product-parser/src/js/database'; // Workaround for badly configured lib

const BNET_GAMES = {
    'd3': {
        name: 'Diablo III',
        launchId: 'D3',
        exes: ['Diablo III', 'Diablo III64'],
        icon: 'Diablo III Launcher.exe'
    },
    'dst2': {
        name: 'Destiny 2',
        launchId: 'DST2',
        exes: ['destiny2'],
        icon: 'Destiny 2 Launcher.exe'
    },
    'hero': {
        name: 'Heroes of the Storm',
        launchId: 'Hero',
        exes: ['HeroesSwitcher', 'HeroesSwitcher_x64'],
        icon: 'Heroes of the Storm.exe'
    },
    /*
    'odin': {
        name: 'Call of Duty: Modern Warfare',
        launchId: 'ODIN',
    },
    */
    'pro': {
        name: 'Overwatch',
        launchId: 'Pro',
        exes: ['Overwatch'],
        icon: 'Overwatch Launcher.exe'
    },
    's1': {
        name: 'Starcraft Remastered',
        launchId: 'S1',
        exes: ['StarCraft'],
        icon: 'StarCraft Launcher.exe'
    },
    's2': {
        name: 'Starcraft 2',
        launchId: 'S2',
        exes: ['SC2Switcher_x64', 'SC2Switcher'],
        icon: 'StarCraft II.exe'
    },
    'viper': {
        name: 'Call of Duty: Black Ops 4',
        launchId: 'VIPR',
        exes: ['BlackOps4', 'BlackOps4_boot'],
        icon: 'Black Ops 4 Launcher.exe'
    },
    'w3': {
        name: 'Warcraft 3: Reforged',
        launchId: 'W3',
        exes: ['Warcraft III'],
        icon: 'Warcraft III.exe'
    },
    'hsb': {
        name: 'Hearthstone',
        launchId: 'WTCG',
        exes: ['Hearthstone'],
        icon: 'Hearthstone.exe'
    },
    'wow': {
        name: 'World of Warcraft',
        launchId: 'WoW',
        exes: ['Wow'],
        icon: 'World of Warcraft Launcher.exe'
    }
};

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
            log.info('Import: Started bnet');
            this.getBattlenetPath().then((bnetPath) => {
                const games = [];
                const bnetExe = path.join(bnetPath, 'Battle.net.exe');

                // Get path to LauncherAutoClose.ps1
                let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
                if (!fs.existsSync(launcherWatcher)) {
                    launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
                }

                const powershellExe = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

                try {
                    const decoded = decoder.decode(fs.readFileSync('C:\\ProgramData\\Battle.net\\Agent\\product.db'));
                    const installed = decoded.productInstall.filter((product) => !(product.uid === 'battle.net' || product.uid === 'agent')); // Filter out non-games

                    installed.forEach((product) => {
                        const gameId = product.uid;
                        const productCode = product.productCode.toLowerCase();
                        if (BNET_GAMES[productCode]) {
                            const launchId = BNET_GAMES[productCode].launchId;
                            const name = BNET_GAMES[productCode].name;
                            const exes = BNET_GAMES[productCode].exes;
                            const icon = path.join(product.settings.installPath, BNET_GAMES[productCode].icon);
                            games.push({
                                id: gameId,
                                name: name,
                                exe: `"${powershellExe}"`,
                                icon: `"${icon}"`,
                                startIn: `"${bnetPath}"`,
                                params: `-windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command "& \\"${launcherWatcher}\\" -launcher \\"battle.net\\" -game \\"${exes.join('\\",\\"')}\\" -launchcmd \\"dummy\\" -bnet $True -bnetpath \\"${bnetExe}\\" -bnetlaunchid \\"${launchId}\\""`,
                                platform: 'bnet'
                            });
                        }
                    });
                    log.info('Import: Completed bnet');
                    resolve(games);
                } catch(err) {
                    reject(err);
                }
            }).catch((err) => reject(err));
        });
    }
}

export default BattleNet;
export const name = 'Blizzard Battle.net';
export const id = 'bnet';
export const official = true;