import React from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import ImportList from './Components/Import/ImportList';
import ImportAllButton from './Components/Import/ImportAllButton';
import Spinner from './Components/spinner';
import TopBlur from './Components/TopBlur';
import Steam from './Steam';
import platformModules from './importers';

const Store = window.require('electron-store');
const SGDB = window.require('steamgriddb');
const { metrohash64 } = window.require('metrohash');
const log = window.require('electron-log');
const { join, extname, dirname } = window.require('path');

class Import extends React.Component {
  constructor(props) {
    super(props);

    this.addGame = this.addGame.bind(this);
    this.addGames = this.addGames.bind(this);

    this.store = new Store();

    this.platforms = Object.keys(platformModules).map((key) => ({
      id: platformModules[key].id,
      name: platformModules[key].name,
      class: platformModules[key].default,
      games: [],
      grids: [],
      posters: [],
      heroes: [],
      installed: false,
      error: false,
    }));

    this.SGDB = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');

    this.state = {
      isLoaded: false,
      loadingText: '',
      installedPlatforms: [],
    };
  }

  async componentDidMount() {
    const nonSteamGames = await Steam.getNonSteamGames();

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

            return platform.class.getGames().then((games) => {
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
          }).catch((err) => {
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
              }).then((res) => {
                platform.grids = this._formatResponse(ids, res);
              }).catch((e) => {
                log.error('Erorr getting grids from SGDB');
                console.error(e);
                // @todo Fallback to text search
                // @todo show an error toast
              });

              gridsPromises.push(getGrids);
            }
          });

          // Update state after we got the grids
          Promise.all(gridsPromises).then(() => {
            this.setState({
              isLoaded: true,
              installedPlatforms,
            });
          });
        }).catch((err) => {
          log.info(`Import: ${err}`);
        });
      });
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

        // Get posters
        const getPosters = this.SGDB.getGrids({ type: platform.id, id: ids.join(','), dimensions: ['600x900'] }).then((res) => {
          posters = this._formatResponse(ids, res);
        }).catch(() => {
          // @todo show an error toast
        });

        // Get heroes
        const getHeroes = this.SGDB.getHeroes({ type: platform.id, id: ids.join(',') }).then((res) => {
          heroes = this._formatResponse(ids, res);
        }).catch(() => {
          // @todo show an error toast
        });

        Promise.all([getPosters, getHeroes]).then(() => {
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
    const { isLoaded, loadingText, installedPlatforms } = this.state;
    const { theme } = this.context;

    if (!isLoaded) {
      return (<Spinner text={loadingText} />);
    }

    return (
      <>
        <TopBlur />
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
                    />
                    <ImportList
                      games={platform.games}
                      platform={platform}
                      grids={platform.grids}
                      onImportClick={this.addGame}
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
