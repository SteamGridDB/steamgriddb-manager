const Registry = window.require('winreg');
const fs = window.require('fs');
const promiseReflect = window.require('promise-reflect');
const log = window.require('electron-log');
const sqlite3 = window.require('sqlite3');
import { IsNotLinux } from '../Linux';
const {remote} = window.require('electron');
const {app} = remote;

const home = app.getPath('home');

class Lutris {
  static isInstalled() {
    return new Promise((resolve, reject) => {
      if (IsNotLinux) {
        return resolve(false);
      }

      
      const dirExists = fs.existsSync(home + '/.local/share/lutris/');
      return resolve(dirExists);
    });
  }

  static getLutrisPath() {
    return new Promise((resolve, reject) => {      
        resolve(home + '/.local/share/lutris/');
    });
  }

  static _processRegKey(key) {
    return new Promise((resolve, reject) => {
      key.get('dependsOn', (err, dependsOn) => {
        if (dependsOn == null) {
          key.values((errItems, items) => {
            const game = {
              platform: 'Lutris',
            };

            items.forEach((item) => {
              if (item.name === 'gameID' || item.name === 'GAMEID') {
                game.id = item.value;
              }

              if (item.name === 'gameName' || item.name === 'GAMENAME') {
                game.name = item.value;
              }

              if (item.name === 'exe' || item.name === 'EXE') {
                game.exe = `"${item.value}"`;
              }

              if (item.name === 'launchParam' || item.name === 'LAUNCHPARAM') {
                game.params = item.value;
              }

              if (item.name === 'path' || item.name === 'PATH') {
                game.startIn = `"${item.value}"`;
              }
            });
            resolve(game);
          });
        } else {
          reject(key);
        }
      });
    });
  }

  static getGames() {
    return new Promise((resolve, reject) => {
      log.info('Import: Started Lutris');
      const games = [];

      this.getLutrisPath().then((result) => {
        const database = new sqlite3.Database(result + 'pga.db', (err) => {
            if (err) console.error('Database opening error: ', err);
        });

        database.all('SELECT * FROM games', (err, rows) => {
          rows.forEach ((row) => {
            console.log(row.name)
            games.push({
              id: row.slug,
              name: row.name,
              exe: `"lutris"`,
              icon: '',
              startIn: `"./"`,
              params: 'lutris:rungame/' + row.slug,
              platform: 'other',
            });
          })

          resolve(games)
        });
        
        return false;
      }).catch((err) => reject(err));
    });
  }
}

export default Lutris;
export const name = 'Lutris';
export const id = 'Lutris';
export const official = true;
