const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const querystring = require('querystring');

class Origin {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Origin'
            });

            reg.valueExists('', (err, exists) => {
                if (err) {
                    reject(new Error('Could not check if Origin is installed.'));
                }

                resolve(exists);
            });
        });
    }

    static getOriginPath() {
        return new Promise((resolve, reject) => {
            let reg = new Registry({
                hive: Registry.HKLM,
                arch: 'x86',
                key:  '\\SOFTWARE\\Origin'
            });

            reg.values((err, items) => {
                if (err) {
                    reject(new Error('Could not find Origin path.'));
                }

                let originPath = false;

                items.forEach((item) => {
                    if (item.name === 'ClientPath') {
                        originPath = item.value;
                    }
                });

                if (originPath) {
                    resolve(originPath);
                } else {
                    reject(new Error('Could not find Origin path.'));
                }
            });
        });
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            this.getOriginPath().then((originPath) => {
                let originDataPath = 'C:\\ProgramData\\Origin';
                let games = [];
                if (fs.existsSync(path.join(originDataPath, 'LocalContent'))) {
                    fs.readdirSync(path.join(originDataPath, 'LocalContent')).forEach((folder) => {
                        let manifestFolder = path.join(originDataPath, 'LocalContent', folder);
                        if (fs.lstatSync(manifestFolder).isDirectory()) {
                            fs.readdirSync(manifestFolder).some((file) => {
                                // Get first file with .mfst extension
                                if (path.extname(file) === '.mfst') {
                                    let manifestFile = path.join(originDataPath, 'LocalContent', folder, file);
                                    
                                    // .mfst file is just a text file with a query string
                                    let manifestStr = fs.readFileSync(manifestFile).toString();
                                    let manifestStrParsed = querystring.parse(manifestStr);

                                    games.push({
                                        id: manifestStrParsed.id,
                                        name: path.basename(folder),
                                        exe: `"${originPath}"`,
                                        startIn: `"${path.dirname(originPath)}"`,
                                        params: `origin://launchgamejump/${manifestStrParsed.id}`,
                                        platform: 'origin'
                                    });
                                    return true;
                                }
                            });
                        }
                    });
                    resolve(games);
                } else {
                    reject('Could not find Origin content folder.');
                }
            });
        });
    }
}

export default Origin;