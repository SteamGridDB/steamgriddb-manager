const Registry = window.require('winreg');
const fs = window.require('fs');
const path = window.require('path');
const querystring = window.require('querystring');
const xml2js = window.require('xml-js').xml2js;
const iconv = window.require('iconv-lite');

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
        let exeDef = false;
        if (runtime.launcher.filePath) {
            // Only one exe
            exeDef = runtime.launcher;
        } else if (runtime.launcher[0] && runtime.launcher[0].filePath) {
            // Multiple exes
            exeDef = runtime.launcher[0]; // Always get first executable
        } else {
            return false;
        }
        // remove everything in [] cause we only need the exe name
        return path.parse(exeDef.filePath._text.replace(/\[.+\]/g, ''));
    }

    static getGames() {
        return new Promise((resolve, reject) => {
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
                                            let xml, executable, name;
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
                                                executable = this._parseRuntime(xml.DiPManifest.runtime);
                                                name = xml.DiPManifest.gameTitles.gameTitle[0]._text;
                                            } else if (xml.game) {
                                                executable = this._parseRuntime(xml.game.runtime);
                                                name = xml.game.metadata.localeInfo[0].title._text;
                                            }

                                            if (executable) {
                                                games.push({
                                                    id: manifestStrParsed.id,
                                                    name: name,
                                                    exe: `"${powershellExe}"`,
                                                    icon: `"${path.join(manifestStrParsed.dipinstallpath, executable.base)}"`,
                                                    startIn: `"${path.dirname(originPath)}"`,
                                                    params: `-windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command "& \\"${launcherWatcher}\\"" -launcher \\"Origin\\" -game \\"${executable.name}\\" -launchcmd \\"origin://launchgamejump/${manifestStrParsed.id}\\""`,
                                                    platform: 'origin'
                                                });
                                                return true;
                                            } else {
                                                return reject(`Could not find game executable for ${path.basename(folder)}`);
                                            }
                                        }
                                    }
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