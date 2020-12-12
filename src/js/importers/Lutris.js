const fs = window.require('fs');
const log = window.require('electron-log');
const sqlite3 = window.require('sqlite3');
import { IsNotLinux } from '../Linux';
import Steam from '../Steam';
const {remote} = window.require('electron');
const { join, extname } = window.require('path');
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

  static getGames() {
    return new Promise((resolve, reject) => {
      log.info('Import: Started Lutris');
      const games = [];

      this.getLutrisPath().then((result) => {
        const database = new sqlite3.Database(result + 'pga.db', (err) => {
            if (err) console.error('Database opening error: ', err);
        });

        let exe = `"lutris"`;
        
        database.all('SELECT * FROM games', (err, rows) => {

          Steam.getCurrentUserGridPath().then((userGridPath) => {
            rows.forEach ((row) => {

              let appId = Steam.generateNewAppId(exe, row.name);
              let icon = join(userGridPath, `${appId}.png`);

              games.push({
                id: row.slug,
                name: row.name,
                exe: exe,
                icon: icon,
                startIn: `"./"`,
                params: 'lutris:rungame/' + row.slug,
                platform: 'other',
              });
            })
  
            resolve(games)
          });
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
