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
import Origin from "./Origin";
import {crc32} from 'crc';

class Import extends React.Component {
    constructor(props) {
        super(props);

        this.store = new Store();

        this.state = {
            isLoaded: false,
            currentPlatform: null,
            originGames: []
        };
    }

    componentDidMount() {
        Origin.isInstalled().then((installed) => {
            if (installed) {
                this.fetchOrigin();
            }
        });
    }

    fetchOrigin() {
        Origin.getGames().then((games) => {
            this.setState({
                isLoaded: true,
                originGames: games
            });
        });
    }

    platformGameSave(platformName, game) {
        this.store.set(`platforms.${platformName}.${crc32(game.id).toString(16)}`, game);
    }

    platformGameRemove(platformName, game) {
        this.store.delete(`platforms.${platformName}.${crc32(game.id).toString(16)}`);
    }

    platformGameExists(platformName, game) {
        return this.store.has(`platforms.${platformName}.${crc32(game.id).toString(16)}`);
    }


    onCheck(game, checked) {
        if (checked) {
            this.platformGameSave('origin', game);
        } else {
            this.platformGameRemove('origin', game);
        }
    }

    gameList(games, platform) {
        return (
            games.map((game) => {
                let checked = false;
                if (this.platformGameExists(platform, game)) {
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
        const {isLoaded, originGames} = this.state;
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
                                <p>Found {originGames.length} Origin Games.</p>
                                <p>Choose games to import from Origin</p>
                            </div>
                            <ListView style={listStyle} listSource={this.gameList(originGames, 'origin')} />
                        </div>
                    </Tab>
                    <Tab title="Uplay">
                        Uplay
                    </Tab>
                    <Tab title="GOG.com">
                        GOG.com
                    </Tab>
                    <Tab title="Epic Games Store">
                        Epic Games Store
                    </Tab>
                </Tabs>
            </div>
        );
    }
}

export default Import;
