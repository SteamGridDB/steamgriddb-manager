const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const querystring = window.require('querystring');
const xml2js = window.require('xml-js').xml2js;
const iconv = window.require('iconv-lite');
const log = window.require('electron-log');

class Origin {
    static isInstalled() {
        return new Promise((resolve, reject) => {
            const reg = new Registry({
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
            const reg = new Registry({
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

    static _parseRuntime(runtime) {
        const exeDefs = [];
        if (runtime.launcher) {
            if (runtime.launcher.filePath) {
                // Only one exe
                exeDefs.push(runtime.launcher.filePath._text);
            } else if (runtime.launcher[0] && runtime.launcher[0].filePath) {
                // Multiple exes
                runtime.launcher.forEach((exe) => {
                    if (exe.filePath) {
                        exeDefs.push(exe.filePath._text);
                    }
                });
            } else {
                return false;
            }
        } else {
            return false;
        }

        // remove everything in [] cause we only need the exe name
        return exeDefs.map((exe) => (exe.replace(/\[.+\]/g, '')));
    }

    static getGames() {
        return new Promise((resolve, reject) => {
            log.info('Import: Started origin');
            this.getOriginPath().then((originPath) => {
                const originDataPath = 'C:\\ProgramData\\Origin';
                const games = [];

                // Get path to LauncherAutoClose.ps1
                let launcherWatcher = path.resolve(path.dirname(process.resourcesPath), '../../../', 'LauncherAutoClose.ps1');
                if (!fs.existsSync(launcherWatcher)) {
                    launcherWatcher = path.join(path.dirname(process.resourcesPath), 'LauncherAutoClose.ps1');
                }

                const powershellExe = path.join(process.env.windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

                if (fs.existsSync(path.join(originDataPath, 'LocalContent'))) {
                    fs.readdirSync(path.join(originDataPath, 'LocalContent')).forEach((folder) => {
                        const manifestFolder = path.join(originDataPath, 'LocalContent', folder);
                        if (fs.lstatSync(manifestFolder).isDirectory()) {
                            fs.readdirSync(manifestFolder).some((file) => {
                                // Get first file with .mfst extension
                                if (path.extname(file) === '.mfst') {
                                    // .mfst file is just a text file with a query string
                                    const manifestFile = path.join(originDataPath, 'LocalContent', folder, file);
                                    const manifestStr = fs.readFileSync(manifestFile).toString();
                                    const manifestStrParsed = querystring.parse(manifestStr);
                                    // Check if has a "dipinstallpath" param
                                    if (manifestStrParsed.dipinstallpath) {
                                        const installerDataPath = path.join(manifestStrParsed.dipinstallpath, '__Installer', 'installerdata.xml');
                                        // If __Installer/installerdata.xml file exists in the install dir
                                        if (fs.existsSync(installerDataPath)) {
                                            // Parse installerdata.xml file
                                            let xml, executables, name;
                                            try {
                                                const installerDataFile = fs.readFileSync(installerDataPath);
                                                try {
                                                    xml = xml2js(iconv.decode(installerDataFile, 'utf8'), {compact: true});
                                                } catch (err) {
                                                    xml = xml2js(iconv.decode(installerDataFile, 'utf16'), {compact: true});
                                                }
                                            } catch (err) {
                                                return reject(`Could not parse installerdata.xml for ${path.basename(folder)}`);
                                            }

                                            if (xml.DiPManifest) {
                                                if (xml.DiPManifest.runtime) {
                                                    executables = this._parseRuntime(xml.DiPManifest.runtime);
                                                }
                                                if (xml.DiPManifest.gameTitles.gameTitle) {
                                                    if (xml.DiPManifest.gameTitles.gameTitle._text) {
                                                        name = xml.DiPManifest.gameTitles.gameTitle._text;
                                                    } else if (xml.DiPManifest.gameTitles.gameTitle[0]) {
                                                        name = xml.DiPManifest.gameTitles.gameTitle[0]._text;
                                                    }
                                                }
                                            } else if (xml.game) {
                                                if (xml.game.runtime) {
                                                    executables = this._parseRuntime(xml.game.runtime);
                                                }
                                                if (xml.game.metadata.localeInfo) {
                                                    if (xml.game.metadata.localeInfo.title) {
                                                        name = xml.game.metadata.localeInfo.title._text;
                                                    } else if (xml.game.metadata.localeInfo[0]) {
                                                        name = xml.game.metadata.localeInfo[0].title._text;
                                                    }
                                                }
                                            }

                                            if (!name) {
                                                return true;
                                            }

                                            if (executables) {
                                                const watchedExes = executables.map((x) => path.parse(path.basename(x)).name);
                                                games.push({
                                                    id: manifestStrParsed.id,
                                                    name: name,
                                                    exe: `"${powershellExe}"`,
                                                    icon: `"${path.join(manifestStrParsed.dipinstallpath, executables[0])}"`,
                                                    startIn: `"${path.dirname(originPath)}"`,
                                                    params: `-windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command "& \\"${launcherWatcher}\\"" -launcher \\"Origin\\" -game \\"${watchedExes.join('\\",\\"')}\\" -launchcmd \\"origin://launchgamejump/${manifestStrParsed.id}\\""`,
                                                    platform: 'origin'
                                                });
                                            }
                                            return true;
                                        }
                                    }
                                }
                            });
                        }
                    });
                    log.info('Import: Completed origin');
                    resolve(games);
                } else {
                    reject('Could not find Origin content folder.');
                }
            });
        });
    }
}

export default Origin;
export const name = 'Origin';
export const id = 'origin';
export const official = true;