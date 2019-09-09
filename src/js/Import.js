const Store = window.require('electron-store');
const SGDB = window.require('steamgriddb');
const metrohash64 = window.require('metrohash').metrohash64;
const log = window.require('electron-log');
import PubSub from 'pubsub-js';
import React from 'react';
import settle from 'promise-settle';
import PropTypes from 'prop-types';
import Image from 'react-uwp/Image';
import ImportList from './ImportList';
import ImportAllButton from './ImportAllButton.js';
import Spinner from './spinner.js';
import TopBlur from './TopBlur';
import Steam from './Steam';
import platformModules from './importers';

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
            error: false
        }));

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

                            log.info(`Import: ${result.value().length} games found for ${this.platforms[index].id}`);

                            if (result.value().length > 0) {
                                const ids = result.value().map((x) => encodeURIComponent(x.id)); // Comma separated list of IDs for use with SGDB API
                                const platform = result.value()[0].platform;

                                log.info(ids.join(','));

                                // Get grids for each game
                                const getGrids = this.SGDB.getGrids({type: platform, id: ids.join(',')}).then((res) => {
                                    let formatted;
                                    // if only single id then return first grid
                                    if (result.value().length === 1) {
                                        if (res.length > 0) {
                                            formatted = [res[0]];
                                        }
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
                            this.platforms[index].error = true;
                            this.platforms[index].errorReason = result.reason();
                            games[this.platforms[index].id] = [];
                            gridsPromises.push(false);
                            log.info(`Import: ${this.platforms[index].id} rejected ${result.reason()}`);
                        } else {
                            // not installed
                            games[this.platforms[index].id] = false;
                            gridsPromises.push(false);
                            log.info(`Import: ${this.platforms[index].id} not installed`);
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
            gamesStorage[metrohash64(game.exe+(typeof game.params !== 'undefined' ? game.params : ''))] = game;
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
                const gamesClone = Object.assign({}, this.state.games);
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
        Steam.addShortcuts([{
            name: game.name,
            exe: game.exe,
            startIn: game.startIn,
            params: game.params,
            tags: [platform.name],
            icon: game.icon
        }]);
        if (image) {
            const gamesClone = Object.assign({}, this.state.games);
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
        let noLaunchers = false;
        if (Object.values(games).every((x) => x === false)) {
            noLaunchers =
                <div style={{padding: 15, paddingLeft: 10, textAlign: 'center', ...this.context.theme.typographyStyles.body}}>
                    <p>Looks like you have no launchers installed.</p>
                    <p>The following launchers are supported: {this.platforms.map((x) => x.name).join(', ')}</p>
                </div>;
        }

        return (
            <>
                <TopBlur/>
                <div id="import-container" style={{height: '100%', overflow: 'auto', padding: 15, paddingLeft: 10, paddingTop: 45}}>
                    {noLaunchers ? (
                        noLaunchers
                    ) : (
                        Object.keys(games).map((platform, i) => {
                            if (!this.platforms[i].error) {
                                return (
                                    <div key={i}>
                                        <h5 style={{float: 'left', ...this.context.theme.typographyStyles.subTitle}}>{this.platforms[i].name}</h5>
                                        <ImportAllButton
                                            games={games[platform]}
                                            grids={grids[i]}
                                            platform={this.platforms[i]}
                                            onButtonClick={this.addGames}
                                        />
                                        <ImportList
                                            games={games[platform]}
                                            platform={this.platforms[i]}
                                            grids={grids[i]}
                                            onImportClick={this.addGame}
                                        />
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={i}>
                                        <h5 style={this.context.theme.typographyStyles.subTitle}>{this.platforms[i].name}</h5>
                                        <p>Error importing: {this.platforms[i].errorReason.message}</p>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </>
        );
    }
}

Import.contextTypes = { theme: PropTypes.object };
export default Import;
