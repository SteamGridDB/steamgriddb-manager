import React from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import { Icon } from 'react-uwp';
import { isEqual } from 'lodash';
import ImportList from './Components/Import/ImportList';
import ImportAllButton from './Components/Import/ImportAllButton';
import Spinner from './Components/spinner';
import Steam from './Steam';
import platformModules from './importers';

const Store = window.require('electron-store');
const SGDB = window.require('steamgriddb');
const { metrohash64 } = window.require('metrohash');
const log = window.require('electron-log');

class Import extends React.Component {
  constructor(props) {
    super(props);

    this.addGame = this.addGame.bind(this);
    this.addGames = this.addGames.bind(this);
    this.checkIfSteamIsRunning = this.checkIfSteamIsRunning.bind(this);
    this.getInstalledPlatforms = this.getInstalledPlatforms.bind(this);

    this.store = new Store();

    this.checkSteamInterval = null;

    this.platforms = Object.keys(platformModules).map((key) => ({
      id: platformModules[key].id,
      name: platformModules[key].name,
      class: platformModules[key].default,
      games: [],
      grids: [],
      posters: [],
      heroes: [],
      logos: [],
      installed: false,
      error: false,
    }));

    this.SGDB = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');
    this.lastNonSteamGames = null;

    this.state = {
      isLoaded: false,
      loadingText: '',
      installedPlatforms: [],
      steamIsRunning: null,
    };
  }

  async componentDidMount() {
    log.info('Opened Import Page');

    await this.checkIfSteamIsRunning();
    this.checkSteamInterval = setInterval(this.checkIfSteamIsRunning, 2000);

    this.getInstalledPlatforms();
  }

  componentWillUnmount() {
    clearInterval(this.checkSteamInterval);
  }

  async getInstalledPlatforms() {
    const nonSteamGames = await Steam.getNonSteamGames();

    if (!isEqual(nonSteamGames, this.lastNonSteamGames)) {
      log.info('Getting installed games for import list');

      this.setState({
        isLoaded: false,
      });

      this.lastNonSteamGames = nonSteamGames;

    Promise.all(this.platforms.map((platform) => platform.class.isInstalled()))
      .then((values) => {
        // Set .installed
        this.platforms.forEach((platform, index) => {
          platform.installed = values[index];
        });

        const installedPlatforms = this.platforms.filter((platform) => (platform.installed));

        // Do .getGames() in sequential order
        const getGames = installedPlatforms
          .reduce((promise, platform) => promise.then(() => {
            this.setState({ loadingText: `Grabbing games from ${platform.name}...` });

              return platform.class.getGames()
                .then((games) => {
                  // Filter out any games that are already imported
                  if (nonSteamGames && nonSteamGames[platform.id]) {
                    games = games.filter((game) => {
                      return !nonSteamGames[platform.id].find((nonSteamGame) => {
                        return nonSteamGame.gameId === game.id;
                      });
                    });
                  }

                  // nonSteamGames[platform.id].gameId
              // Populate games array
              platform.games = games;
            });
            })
              .catch((err) => {
            platform.error = true;
            log.info(`Import: ${platform.id} rejected ${err}`);
          }), Promise.resolve());

        getGames.then(() => {
          this.setState({ loadingText: 'Getting images...' });

          const gridsPromises = [];
          installedPlatforms.forEach((platform) => {
              if (platform.games.length) {
            // Get grids for each platform
            const ids = platform.games.map((x) => encodeURIComponent(x.id));

                const getGrids = this.SGDB.getGrids({
                  type: platform.id,
                  id: ids.join(','),
                  dimensions: ['460x215', '920x430'],
                })
                  .then((res) => {
              platform.grids = this._formatResponse(ids, res);
              return res;
                  })
                  .catch((e) => {
                    log.error('Erorr getting grids from SGDB');
                    console.error(e);
                    // @todo We need a way to log which game caused the error
                    // @todo Fallback to text search
                    // @todo show an error toast
            });
            gridsPromises.push(platform.games.map(x => ({ name: x.name, id: x.id })));
            gridsPromises.push(getGrids);
              }
          });

          // Update state after we got the grids
            Promise.all(gridsPromises)
              .then((res) => {
            this.setState({
              isLoaded: true,
              installedPlatforms,
            });
            var failedGames = [];
            for (var i = 0; i < res.length; i += 2) {
              var games = res[i];
              var result = res[i + 1];

              // we will only find errors here for a multiple id search, in single search on error will be caught above
              if (games.length > 1) {
                games.map((game, i) => {
                  if ((!result[i].success) && result[i].errors[0] == "Game not found") {
                    failedGames.push(games[i]);
                  }
          });
              }
            }
            const checkPromises = this.checkFailedGames(failedGames);
            Promise.all(checkPromises).then((res) => this.logFailedGames(res));
          });
          })
            .catch((err) => {
          log.info(`Import: ${err}`);
        });
      });
  }

  logFailedGames(res) {
    for (var i = 0; i < res.length; i += 2) {
      var pre = res[i];
      var msgs = res[i + 1];

      log.info(pre);
      msgs.map((msg) => {
        log.info(msg);
      });
    }
  }

  checkFailedGames(failedGames) {
    var promises = [];

    failedGames.map((failedGame) => {
      promises.push(`Game '${failedGame.name}', id ${failedGame.id} not found, looking for alternatives...`);
      const sg = new Promise((resolve, reject) => {
        this.SGDB.searchGame(failedGame.name).then((res) => {
          var results = [];
          res.forEach((altGame, i) => {
            const altGameTypes = JSON.stringify(altGame.types);
            results.push(`${i}: name: '${altGame.name}', id: '${altGame.id}', type: '${altGameTypes}'`);
          });

          resolve(results);
        }).catch((err) => {
          reject(`searchGame: ${err}`);
        });
      });
      promises.push(sg);
    });

    return promises;
  }

  /*
   * @todo We might want to put this at the App level, and publish changes via PubSub or props,
   *   so different pages can display their own message if Steam is running.
   */
  async checkIfSteamIsRunning() {
    const steamIsRunning = await Steam.checkIfSteamIsRunning();

    if (steamIsRunning !== this.state.steamIsRunning) {
      log.info(`Steam is ${steamIsRunning ? 'open' : 'closed'}`);

      this.setState({
        steamIsRunning,
      });

      // Update non-Steam games in case changes were made while Steam was open
      if (!steamIsRunning) {
        setTimeout(() => {
          this.getInstalledPlatforms();
        }, 0);
      }
    }
  }

  saveImportedGames(games) {
    const gamesStorage = this.store.get('games', {});

    games.forEach((game) => {
      const key = game.exe + (
        typeof game.params !== 'undefined'
          ? game.params
          : ''
      );

      const configId = metrohash64(key);
      gamesStorage[configId] = game;
    });

    this.store.set('games', gamesStorage);
  }

  // @todo this is horrible but can't be arsed right now
  _formatResponse(ids, res) {
    let formatted = false;

    // if only single id then return first grid
    if (ids.length === 1) {
      if (res.length > 0) {
        formatted = [res[0]];
      }
    } else {
      // if multiple ids treat each object as a request
      formatted = res.map((x) => {
        if (x.success) {
          if (x.data[0]) {
            return x.data[0];
          }
        }
        return false;
      });
    }
    return formatted;
  }

  addGames(games, platform) {
    this.saveImportedGames(games);

    const shortcuts = games.map((game) => ({
      name: game.name,
      exe: game.exe,
      startIn: game.startIn,
      params: game.params,
      tags: [platform.name],
      icon: game.icon,
    }));

    log.info(`Trying to import ${games.length} games from ${platform.name}`);

    Steam.addShortcuts(shortcuts).then(() => {
      Steam.addCategory(games, platform.name).then(() => {
        PubSub.publish('toast', {
          logoNode: 'ImportAll',
          title: 'Successfully Imported!',
          contents: (
            <p>
              {games.length}
              { ' ' }
              games imported from
              { ' ' }
              {platform.name}
            </p>
          ),
        });
      }).then(() => {
        // Download images
        PubSub.publish('toast', {
          logoNode: 'Download',
          title: 'Downloading Images...',
          contents: (<p>Downloading images for imported games...</p>),
        });

        const ids = games.map((x) => encodeURIComponent(x.id));
        let posters = [];
        let heroes = [];
        let logos = [];

        // Get posters
        const getPosters = this.SGDB.getGrids({ type: platform.id, id: ids.join(','), dimensions: ['600x900'] }).then((res) => {
          posters = this._formatResponse(ids, res);
        }).catch((e) => {
          log.error('Error getting posters');
          console.error(e);
          // @todo show an error toast
        });

        // Get heroes
        const getHeroes = this.SGDB.getHeroes({ type: platform.id, id: ids.join(',') }).then((res) => {
          heroes = this._formatResponse(ids, res);
        }).catch((e) => {
          log.error('Error getting heroes');
          console.error(e);
          // @todo show an error toast
        });

        // Get heroes
        const getLogos = this.SGDB.getLogos({ type: platform.id, id: ids.join(',') }).then((res) => {
          logos = this._formatResponse(ids, res);
        }).catch((e) => {
          log.error('Error getting logos');
          console.error(e);
          // @todo show an error toast
        });

        Promise.all([getPosters, getHeroes, getLogos]).then(() => {
          const downloadPromises = [];

          games.forEach((game, i) => {
            const appId = Steam.generateNewAppId(game.exe, game.name);

            // Take (legacy) grids from when we got them for the ImportList
            const savedGrid = platform.grids[platform.games.indexOf(games[i])];

            if (platform.grids[i] && savedGrid) {
              const appIdOld = Steam.generateAppId(game.exe, game.name);

              downloadPromises.push(Steam.addAsset('horizontalGrid', appId, savedGrid.url));

              // Old app id is for Big Picture Mode
              downloadPromises.push(Steam.addAsset('horizontalGrid', appIdOld, savedGrid.url));
            }

            // Download posters
            if (posters[i]) {
              downloadPromises.push(Steam.addAsset('verticalGrid', appId, posters[i].url));
            }

            // Download heroes
            if (heroes[i]) {
              downloadPromises.push(Steam.addAsset('hero', appId, heroes[i].url));
            }

            // Download logos
            if (heroes[i]) {
              downloadPromises.push(Steam.addAsset('logo', appId, logos[i].url));
            }
          });

          Promise.all(downloadPromises).then(() => {
            PubSub.publish('toast', {
              logoNode: 'Download',
              title: 'Downloads Complete',
              contents: (<p>All Images Downloaded!</p>),
            });
          });
        });
      }).catch((err) => {
        log.error('Cannot import while Steam is running');

        if (err.type === 'OpenError') {
          PubSub.publish('toast', {
            logoNode: 'Error',
            title: 'Error Importing',
            contents: (
              <p>
                Cannot import while Steam is running.
                <br />
                Close Steam and try again.
              </p>
            ),
          });
        }
      });
    });
  }

  addGame(game, platform) {
    return this.addGames([game], platform);
  }

  render() {
    const {
      isLoaded, loadingText, installedPlatforms, steamIsRunning,
    } = this.state;
    const { theme } = this.context;

    if (!isLoaded) {
      return (<Spinner text={loadingText} />);
    }

    return (
      <>
        <div
          id="import-container"
          style={{
            height: '100%',
            overflow: 'auto',
            padding: 15,
            paddingLeft: 10,
            paddingTop: 45,
          }}
        >
          {steamIsRunning
            && (
              <div style={{
                width: '100%',
                backgroundColor: '#c06572',
                padding: '10px',
                marginBottom: '10px',
              }}
              >
                <Icon style={{
                  marginBottom: '2px',
                  marginRight: '5px',
                }}
                >
                  IncidentTriangle
                </Icon>
                SteamGridDB Manager can not import games while Steam is running. Please close Steam.
              </div>
            )}
          {
            installedPlatforms.map((platform) => {
              if (!platform.error && platform.games.length) {
                return (
                  <div key={platform.id}>
                    <h5 style={{ float: 'left', ...theme.typographyStyles.subTitle }}>{platform.name}</h5>
                    <ImportAllButton
                      games={platform.games}
                      platform={platform}
                      grids={platform.grids}
                      onButtonClick={this.addGames}
                      steamIsRunning={steamIsRunning}
                    />
                    <ImportList
                      games={platform.games}
                      platform={platform}
                      grids={platform.grids}
                      onImportClick={this.addGame}
                      steamIsRunning={steamIsRunning}
                    />
                  </div>
                );
              }

              return <></>;
            })
          }
        </div>
      </>
    );
  }
}

Import.contextTypes = { theme: PropTypes.object };
export default Import;
