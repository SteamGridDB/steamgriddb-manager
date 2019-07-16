const Store = window.require('electron-store');
import React from 'react';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Tabs, { Tab } from "react-uwp/Tabs";
import TextBox from "react-uwp/TextBox";
import ListView, { ListViewProps } from "react-uwp/ListView";
import Separator from "react-uwp/Separator";
import CheckBox from "react-uwp/CheckBox";
import Toggle from "react-uwp/Toggle";
import Spinner from './spinner.js';
import Steam from "./Steam";
import Origin from "./Origin";
import Uplay from "./Uplay";
import Epic from "./Epic";
import Gog from "./Gog";
import {crc32} from 'crc';

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

                Promise.all(this.platforms.map((platform) => {
                    if (platform.installed) {
                        return platform.class.getGames()
                    } else {
                        return false;
                    }
                })).then((values) => {
                    this.setState({
                        isLoaded: true,
                        games: values
                    })
                });
            });
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

    onCheck(game, checked) {
        if (checked) {
            this.platformGameSave(game);
            Steam.addShortcut(game.name, game.exe, game.startIn, game.params);
        } else {
            this.platformGameRemove(game);
            Steam.removeShortcut(game.name, game.exe);
        }
    }

    gameList(games, platform) {
        if (games == false) {

        }

        return (
            games.map((game) => {
                let checked = false;
                if (this.platformGameExists(game)) {
                    checked = true;
                }

                return (
                    <span key={game.id}>
                        <CheckBox
                            onCheck={this.onCheck.bind(this, game)}
                            background='none'
                            style={{width: '100%'}}
                            labelPosition='left'
                            label={game.name}
                            defaultChecked={checked}
                        />
                    </span>
                )
            })
        )
    }

    render() {
        const {isLoaded, games} = this.state;
        const listStyle = {
            background: 'none',
            border: 0
        }

        if (!isLoaded) {
            return (<Spinner/>);
        }

        games.map((game, i) => {console.log(this.platforms[i].name, i)});

        return (
            <div>
                <Tabs useAnimate={true} style={{width: '100%'}}>
                    {games.map((game, i) => (
                        <Tab title={this.platforms[i].name} key={i}>
                            <div style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)'}}>
                                {game ? (
                                    <div style={{padding: 10}}>
                                        <p>Choose games to import from {this.platforms[i].name}</p>
                                        <ListView style={listStyle} listSource={this.gameList(game, this.platforms[i].id)} />
                                    </div>
                                ) : (
                                    <div style={{padding: 10}}>
                                        <p>{this.platforms[i].name} is not installed.</p>
                                    </div>
                                )}
                            </div>
                        </Tab>
                    ))}
                </Tabs>
            </div>
        );
    }
}

export default Import;
