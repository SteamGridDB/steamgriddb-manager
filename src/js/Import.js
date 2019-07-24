const Store = window.require('electron-store');
const SGDB = window.require('steamgriddb');
import React from 'react';
import settle from 'promise-settle';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import TextBox from "react-uwp/TextBox";
import ListView, { ListViewProps } from "react-uwp/ListView";
import Separator from "react-uwp/Separator";
import CheckBox from "react-uwp/CheckBox";
import Image from "react-uwp/Image";
import Toggle from "react-uwp/Toggle";
import Button from "react-uwp/Button";
import Spinner from './spinner.js';
import Steam from "./Steam";
import Origin from "./Origin";
import Uplay from "./Uplay";
import Epic from "./Epic";
import Gog from "./Gog";
import BattleNet from "./BattleNet";

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
            games: []
        };
    }

    componentDidMount() {
        Promise.all(this.platforms.map((platform) => platform.class.isInstalled()))
            .then((values) => {
                for (var i = 0; i < values.length; i++) {
                    this.platforms[i].installed = values[i];
                }

                // Generate array of getGames() promises if installed
                let getGamesPromises = this.platforms.map((platform) => {
                    if (platform.installed) {
                        return platform.class.getGames();
                    } else {
                        return false;
                    }
                });

                settle(getGamesPromises).then((results) => {
                    let games = [];
                    let gridsPromises = [];

                    results.forEach((result) => {
                        if (result.isFulfilled()) {
                            games.push(result.value());
                            let ids = result.value().map(x => encodeURIComponent(x.id)).join(','); // Comma separated list of IDs for use with SGDB API
                            let platform = result.value()[0].platform;

                            // Get grids for each game
                            gridsPromises.push(this.SGDB.getGrids({type: platform, id: ids}));
                        } else {
                            // getGames() rejected
                            // result.reason()
                            games.push(false);
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
            gamesStorage[Steam.generateAppId(game.exe, game.name)] = game;
        });
        this.store.set('games', gamesStorage);
    }

    platformGameSave(game) {
        this.store.set(`games.${Steam.generateAppId(game.exe, game.name)}`, game);
    }

    platformGameRemove(game) {
        this.store.delete(`games.${Steam.generateAppId(game.exe, game.name)}`);
    }

    platformGameExists(game) {
        return this.store.has(`games.${Steam.generateAppId(game.exe, game.name)}`);
    }

    addGames(games, grids) {
        this.platformGamesSave(games);
        Steam.addShortcuts(games);
        games.forEach((game, i) => {
            let thumb = null;
            let image = null;
            if (games.length > 1 && grids[i].length === 1 && grids[i][0].success !== false) {
                image = grids[i][0].url;
            } else if (games.length === 1 && grids) {
                image = grids[0].url;
            }
            if (image) {
                Steam.addGrid(Steam.generateAppId(game.exe, game.name), image);
            }
        });
    }

    addGame(game, image) {
        this.platformGameSave(game);
        Steam.addShortcut(game.name, game.exe, game.startIn, game.params);
        if (image) {
            Steam.addGrid(Steam.generateAppId(game.exe, game.name), image);
        }
    }

    generateListItems(games, platform, grids) {
        return (
            games.map((game, i) => {
                let thumb = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII=';
                let image = null;
                if (games.length > 1 && grids[i].length === 1 && grids[i][0].success !== false) {
                    thumb = grids[i][0].thumb;
                    image = grids[i][0].url;
                } else if (games.length === 1 && grids) {
                    thumb = grids[0].thumb;
                    image = grids[0].url;
                }


                return (
                    <div style={{display: 'flex', alignItems: 'center', width: 'inherit'}} key={game.id}>
                        <Image
                            style={{marginRight: 10}}
                            height='30px'
                            width='64px'
                            src={thumb}
                        />
                        {game.name}
                        <Button style={{opacity: 0, marginLeft: 'auto'}} onClick={this.addGame.bind(this, game, image)}>Import</Button>
                    </div>
                )
            })
        )
    }

    render() {
        const {isLoaded, games, grids} = this.state;
        const listStyle = {
            background: 'none',
            border: 0,
            width: '100%',
            marginBottom: 10,
            clear: 'both'
        }

        if (!isLoaded) {
            return (<Spinner/>);
        }

        return (
            <div className="import-list" style={{padding: 15, paddingLeft: 0}}>
                {games.map((game, i) => (
                    <div key={i}>
                        <h5 style={{float: 'left', ...getTheme().typographyStyles.subTitle}}>{this.platforms[i].name}</h5>
                        {game ? (
                            <div>
                                <Button style={{float: 'right'}} onClick={this.addGames.bind(this, game, grids[i])}>Import All</Button>
                                <ListView style={listStyle} listSource={this.generateListItems(game, this.platforms[i].id, grids[i])} />
                            </div>
                        ) : (
                            <div style={{padding: 10, clear: 'both'}}>
                                <p>{this.platforms[i].name} is not installed.</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
}

export default Import;
