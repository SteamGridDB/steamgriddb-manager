const Store = window.require('electron-store');
import React from 'react';
import settle from 'promise-settle';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import TextBox from "react-uwp/TextBox";
import ListView, { ListViewProps } from "react-uwp/ListView";
import Separator from "react-uwp/Separator";
import CheckBox from "react-uwp/CheckBox";
import Toggle from "react-uwp/Toggle";
import Button from "react-uwp/Button";
import Spinner from './spinner.js';
import Steam from "./Steam";
import Origin from "./Origin";
import Uplay from "./Uplay";
import Epic from "./Epic";
import Gog from "./Gog";

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
                id: 'gog',
                name: 'GOG.com',
                class: Gog
            }
        ];

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

                // Generate array of getGames() promises
                let getGamesPromises = this.platforms.map((platform) => {
                    if (platform.installed) {
                        return platform.class.getGames();
                    } else {
                        return false;
                    }
                });

                settle(getGamesPromises).then((results) => {
                    let games = [];
                    results.forEach((result) => {
                        if (result.isFulfilled()) {
                            games.push(result.value());
                        } else {
                            // getGames() rejected
                            // result.reason()
                            games.push(false);
                        }
                    })

                    this.setState({
                        isLoaded: true,
                        games: games
                    });
                });
            });
    }

    platformGamesSave(games) {
        let formatted = {'games': {}};
        games.forEach((game) => {
            formatted.games[Steam.generateAppId(game.exe, game.name)] = game;
        });
        this.store.set(formatted);
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

    addGames(games) {
        this.platformGamesSave(games);
        Steam.addShortcuts(games);
    }

    addGame(game) {
        this.platformGameSave(game);
        Steam.addShortcut(game.name, game.exe, game.startIn, game.params);
    }

    generateListItems(games, platform) {
        return (
            games.map((game) => {
                return (
                    <div style={{display: 'flex', alignItems: 'center', width: 'inherit'}} key={game.id}>
                        {game.name} <Button style={{opacity: 0, marginLeft: 'auto'}} onClick={this.addGame.bind(this, game)}>Import</Button>
                    </div>
                )
            })
        )
    }

    render() {
        const {isLoaded, games} = this.state;
        const listStyle = {
            background: 'none',
            border: 0,
            width: '100%',
            marginBottom: 10
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
                                <Button style={{float: 'right'}} onClick={this.addGames.bind(this, game, this.platforms[i].id)}>Import All</Button>
                                <ListView style={listStyle} listSource={this.generateListItems(game, this.platforms[i].id)} />
                            </div>
                        ) : (
                            <div style={{padding: 10}}>
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
