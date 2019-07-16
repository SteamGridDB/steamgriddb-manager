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

        this.state = {
            isLoaded: false,
            currentPlatform: null,
            originGames: [],
            uplayGames: [],
            epicGames: [],
            gogGames: []
        };
    }

    componentDidMount() {
        let originGamesPromise = Origin.getGames();
        let uplayGamesPromise = Uplay.getGames();
        let epicGamesPromise = Epic.getGames();
        let gogGamesPromise = Gog.getGames();
        Promise.all([originGamesPromise, uplayGamesPromise, epicGamesPromise, gogGamesPromise]).then((values) => {
            this.setState({
                isLoaded: true,
                originGames: values[0],
                uplayGames: values[1],
                epicGames: values[2],
                gogGames: values[3]
            })
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
        const {isLoaded, originGames, uplayGames, epicGames, gogGames} = this.state;
        const listStyle = {
            background: 'none',
            border: 0
        }

        if (!isLoaded) {
            return (<Spinner/>);
        }

        return (
            <div>
                <Tabs useAnimate={true} style={{width: '100%'}}>
                    <Tab title="Origin" style={{width: '100%'}}>
                        <div style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)'}}>
                            <div style={{padding: 10}}>
                                <p>Choose games to import from Origin</p>
                            </div>
                            <ListView style={listStyle} listSource={this.gameList(originGames, 'origin')} />
                        </div>
                    </Tab>
                    <Tab title="Uplay">
                        <div style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)'}}>
                            <div style={{padding: 10}}>
                                <p>Choose games to import from Uplay</p>
                            </div>
                            <ListView style={listStyle} listSource={this.gameList(uplayGames, 'uplay')} />
                        </div>
                    </Tab>
                    <Tab title="Epic Games Launcher">
                        <div style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)'}}>
                            <div style={{padding: 10}}>
                                <p>Choose games to import from the Epic Games Launcher</p>
                            </div>
                            <ListView style={listStyle} listSource={this.gameList(epicGames, 'egs')} />
                        </div>
                    </Tab>
                    <Tab title="GOG.com">
                        <div style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)'}}>
                            <div style={{padding: 10}}>
                                <p>Choose games to import from the GOG</p>
                            </div>
                            <ListView style={listStyle} listSource={this.gameList(gogGames, 'gog')} />
                        </div>
                    </Tab>
                </Tabs>
            </div>
        );
    }
}

export default Import;
