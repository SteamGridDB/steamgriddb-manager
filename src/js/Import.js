const Store = window.require('electron-store');
const SGDB = window.require('steamgriddb');
const metrohash64 = window.require('metrohash').metrohash64;
import PubSub from 'pubsub-js';
import React from 'react';
import settle from 'promise-settle';
import PropTypes from 'prop-types';
import Button from 'react-uwp/Button';
import Image from 'react-uwp/Image';
import ImportList from './ImportList';
import Spinner from './spinner.js';
import Steam from './Steam';
import Origin from './Origin';
import Uplay from './Uplay';
import Epic from './Epic';
import Gog from './Gog';
import BattleNet from './BattleNet';
//import Bethesda from './Bethesda';

class Import extends React.Component {
    constructor(props) {
        super(props);

        this.store = new Store();

        this.platforms = [
            {
                id: 'origin',
                name: 'Origin',
                class: Origin
            },
            {
                id: 'uplay',
                name: 'Uplay',
                class: Uplay
            },
            {
                id: 'egs',
                name: 'Epic Games Launcher',
                class: Epic
            },
            {
                id: 'bnet',
                name: 'Blizzard Battle.net',
                class: BattleNet
            },
            {
                id: 'gog',
                name: 'GOG.com',
                class: Gog
            }
        ];

        this.SGDB = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');

        this.state = {
            isLoaded: false,
            games: {}
        };
    }

    componentDidMount() {
        Promise.all(this.platforms.map((platform) => platform.class.isInstalled()))
            .then((values) => {
                for (let i = 0; i < values.length; i++) {
                    this.platforms[i].installed = values[i];
                }

                // Generate array of getGames() promises if installed
                const getGamesPromises = this.platforms.map((platform) => {
                    if (platform.installed) {
                        return platform.class.getGames();
                    } else {
                        return false;
                    }
                });

                settle(getGamesPromises).then((results) => {
                    const games = {};
                    const gridsPromises = [];

                    results.forEach((result, index) => {
                        if (result.isFulfilled() && result.value() !== false) {
                            games[this.platforms[index].id] = result.value();

                            if (result.value().length > 0) {
                                const ids = result.value().map((x) => encodeURIComponent(x.id)).join(','); // Comma separated list of IDs for use with SGDB API
                                const platform = result.value()[0].platform;

                                // Get grids for each game
                                const getGrids = this.SGDB.getGrids({type: platform, id: ids}).then((res) => {
                                    let formatted;
                                    // if only single id then return first grid
                                    if (result.value().length === 1) {
                                        formatted = [res[0]];
                                    } else {
                                        // if multiple ids treat each object as a request
                                        formatted = res.map((x) => {
                                            if (x.success) {
                                                return x.data;
                                            } else {
                                                return false;
                                            }
                                        });
                                    }
                                    return formatted;
                                }).catch(() => {
                                    // show an error toast
                                });
                                gridsPromises.push(getGrids);
                            } else {
                                gridsPromises.push(false);
                            }
                        } else if (result.isRejected()) {
                            // getGames() rejected
                            // result.reason()
                        } else {
                            // not installed
                            games[this.platforms[index].id] = false;
                            gridsPromises.push(false);
                        }
                    });

                    Promise.all(gridsPromises).then((values) => {
                        this.setState({
                            isLoaded: true,
                            games: games,
                            grids: values
                        });
                    });
                });
            });
    }

    platformGamesSave(games) {
        let gamesStorage = this.store.get('games');
        if (!gamesStorage) {
            gamesStorage = {};
        }

        games.forEach((game) => {
            gamesStorage[metrohash64(game.exe+game.params)] = game;
        });
        this.store.set('games', gamesStorage);
    }

    platformGameSave(game) {
        this.store.set(`games.${metrohash64(game.exe+(typeof game.params !== 'undefined' ? game.params : ''))}`, game);
    }

    platformGameRemove(game) {
        this.store.delete(`games.${metrohash64(game.exe+game.params)}`);
    }

    addGames(games, grids, platform) {
        this.platformGamesSave(games);

        // Add shortcuts with platform name as tag
        Steam.addShortcuts(games.map((game) => {
            game.tags = [platform.name];
            return game;
        }));

        const addGridPromises = [];
        games.forEach((game, i) => {
            let image = null;
            if (games.length > 1 && grids[i].length === 1 && grids[i][0].success !== false) {
                image = grids[i][0].url;
            } else if (games.length === 1 && grids) {
                image = grids[0].url;
            }
            if (image) {
                const gamesClone = Object.assign(this.state.games);
                const addGrid = Steam.addGrid(Steam.generateAppId(game.exe, game.name), image, (progress) => {
                    gamesClone[platform.id][gamesClone[platform.id].indexOf(game)].progress = progress;
                    this.setState({gamesClone});
                });

                addGridPromises.push(addGrid);
            }
        });

        Promise.all(addGridPromises).then(() => {
            PubSub.publish('toast', {logoNode: 'ImportAll', title: 'Successfully Imported!', contents: (
                <p>{games.length} games imported from {platform.name}</p>
            )});
        });
    }

    addGame(game, image, platform) {
        this.platformGameSave(game);
        Steam.addShortcut(game.name, game.exe, game.startIn, game.params, [platform.name]);
        if (image) {
            const gamesClone = Object.assign(this.state.games);
            Steam.addGrid(Steam.generateAppId(game.exe, game.name), image, (progress) => {
                gamesClone[platform.id][gamesClone[platform.id].indexOf(game)].progress = progress;
                this.setState({gamesClone});
            }).then((dest) => {
                PubSub.publish('toast', {logoNode: 'Import', title: `Successfully Imported: ${game.name}`, contents: (
                    <Image
                        style={{width: '100%', marginTop: 10}}
                        src={dest}
                    />
                )});
            }).catch((err) => {
                PubSub.publish('toast', {logoNode: 'Error', title: `Failed to import: ${game.name}`, contents: (
                    <p>{err.message}</p>
                )});
            });
        }
    }

    render() {
        const {isLoaded, games, grids} = this.state;

        if (!isLoaded) {
            return (<Spinner/>);
        }

        // if no launcher installed
        if (Object.values(games).every((x) => x === false)) {
            return (
                <div className="import-list" style={{padding: 15, paddingLeft: 0, textAlign: 'center', ...this.context.theme.typographyStyles.body}}>
                    <p>Looks like you have no launchers installed. Install some launchers to import games from them into Steam.</p>
                    <p>The following launchers are supported: {this.platforms.map((x) => x.name).join(', ')}</p>
                </div>
            );
        }

        return (
            <div className="import-list" style={{padding: 15, paddingLeft: 0}}>
                {Object.keys(games).map((platform, i) => (
                    <div key={i}>
                        {this.platforms[i].installed && (
                            <div>
                                <h5 style={{float: 'left', ...this.context.theme.typographyStyles.subTitle}}>{this.platforms[i].name}</h5>
                                <Button style={{float: 'right'}} onClick={this.addGames.bind(this, games[platform], grids[i], this.platforms[i])}>Import All</Button>
                                <ImportList
                                    games={games[platform]}
                                    platform={this.platforms[i]}
                                    grids={grids[i]}
                                    onImportClick={this.addGame.bind(this)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
}

Import.contextTypes = { theme: PropTypes.object };
export default Import;
