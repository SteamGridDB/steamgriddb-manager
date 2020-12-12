const Registry = window.require('winreg');
const fs = window.require('fs');
const log = window.require('electron-log');
const cheerio = window.require('cheerio');
const request = window.require('request');
const Shell = require('node-powershell');
import { IsLinux } from '../Linux';

class Oculus {
  static isInstalled() {
    return new Promise((resolve, reject) => {
      const reg = new Registry({
        hive: Registry.HKCU,
        arch: 'x86',
        key: '\\Software\\Oculus VR, LLC\\Oculus\\Libraries',
      });

      if (IsLinux) {
        return resolve(false);
      }
      
      reg.valueExists('', (err, exists) => {
        if (err) {
          reject(new Error('Could not check if Oculus is installed.'));
        }
        resolve(exists);
      });
    });
  }

  // Gets the configured Oculus library path
  // TODO: Support multiple configured library paths 
  static getOculusLibraryPath() {
    return new Promise((resolve, reject) => {
      const reg = new Registry({
        hive: Registry.HKCU,
        arch: 'x86',
        key: '\\Software\\Oculus VR, LLC\\Oculus\\Libraries',
      });

      // Get all subkeys (one subkey is one Library folder)
      reg.keys((err, keys) => {
        if (err) {
          reject(err);
        }

        keys.forEach(key => {
          // Get the Path for the Library
          key.values((err, items) => {
            if (err) {
              reject(err);
            }
        
            let oculusLibraryPath = false;
        
            items.forEach((item) => {
              if (item.name === 'Path') {
                oculusLibraryPath = item.value;
              }
            });
        
            if (oculusLibraryPath) {
              resolve(oculusLibraryPath);
            } else {
              reject(new Error('Could not find Oculus Library path.'));
            }
          });
        });
      });
    });
  }

  static getFilesFromPath(path, extension) {
    return new Promise((resolve, reject) => {
      let dir = fs.readdirSync( path );
      resolve(dir.filter( elm => elm.match(new RegExp(`.*\.(${extension})`, 'ig'))));
    });
  }

  // Converts a GUID Volume path into a lettered path
  // i.e. "\\?\Volume{56d4b0e2-0000-0000-0000-00a861000000}\"
  // ---> "F:\"
  static getVolumeLetteredPath(volumeGUIDPath) {
    return new Promise((resolve, reject) => {
        const command = "GWMI -namespace root\\cimv2 -class win32_volume | FL -property DriveLetter, DeviceID";
        const ps = new Shell({
            executionPolicy: 'Bypass',
            noProfile: true
        });
        ps.addCommand(command);
        ps.invoke().then(output => {
            // Ugly way to parse Drive Letters and GUIDs from the console output
            let pairs = output.split("\r\n\r\n").filter(p => p.includes("\r\n"));
            pairs.forEach(p => {
                let letterRow = p.split("\r\n")[0];
                let guidRow = p.split("\r\n")[1];
                let letter = letterRow.split(" : ")[1];
                let guid = guidRow.split(" : ")[1];
                //log.info(letter + " = " + guid);
                if (volumeGUIDPath.includes(guid)) {
                    resolve(volumeGUIDPath.replace(guid, letter + "\\"));
                }
            })
            reject(new Error('No letter found for GUID path: ' + volumeGUIDPath));
        });
    })
  }

  // Gets the game title from Oculus website
  static getGameTitle(appId) {
    return new Promise((resolve, reject) => {
      const url = "https://www.oculus.com/experiences/rift/" + appId + "/";
      request.get(url, (error, response, data) => {
        const $ = cheerio.load(data);
        let jsonStr = $("head > script[type='application/ld+json']").html();
        let json = JSON.parse(jsonStr);
        //log.info(json);
        resolve(json.name);
      });
    });
  }

  static getGames() {
    return new Promise((resolve, reject) => {
      log.info('Import: Started oculus');

      this.getOculusLibraryPath().then(oculusLibraryPath => {
        //log.info('Got Oculus Library path: ' + oculusLibraryPath);

        this.getVolumeLetteredPath(oculusLibraryPath).then(volumeLetteredPath => {
            const manifestDir = volumeLetteredPath + "\\Manifests";
            const softwareDir = volumeLetteredPath + "\\Software";
            const games = [];
            const addGamesPromises = [];
      
            this.getFilesFromPath(manifestDir, '.json.mini').then(filePaths => {
                filePaths.forEach(fp => {
                    let manifest = JSON.parse(fs.readFileSync(manifestDir + "\\" + fp));
                    const exePath = softwareDir + "\\" + manifest.canonicalName + "\\" + manifest.launchFile;
                    const addGame = this.getGameTitle(manifest.appId).then(name => {
                        games.push({
                          id: manifest.appId,
                          name: name,
                          exe: exePath,
                          icon: exePath,
                          params: "",
                          platform: 'oculus',
                        });
                    });
                    addGamesPromises.push(addGame);
                  });

                  Promise.all(addGamesPromises).then(() => {
                    log.info('Import: Completed oculus');
                    return resolve(games);
                  }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
      });
    });
  }
}

export default Oculus;
export const name = 'Oculus';
export const id = 'oculus';
export const official = false;
