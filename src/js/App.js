import React from 'react';
import {TitleBar} from 'react-desktop/windows';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Tabs, {Tab} from "react-uwp/Tabs";
import {IconButton} from "react-uwp";
import ToastHandler from "./toastHandler.js";

import {HashRouter as Router, Redirect, Link, Route} from 'react-router-dom';

import Search from './Search.js';
import Games from './games.js';

// Using window.require so babel doesn't change the node require
const electron = window.require('electron');
const remote = electron.remote;

import "../css/App.css";

import Steam from './Steam.js';
window.Steam = Steam;

class App extends React.Component {
    constructor(props) {
        super(props)

        this.state = {isMaximized: false}
        this.toggleMaximize = this.toggleMaximize.bind(this);

        //Track windows snap calling maximize / unmaximize
        let window = remote.BrowserWindow.getFocusedWindow();

        window.on('maximize', () => {
            this.setState({ isMaximized: true })
        });

        window.on('unmaximize', () => {
            this.setState({ isMaximized: false })
        });
    }

    close() {
        let window = remote.BrowserWindow.getFocusedWindow();
        window.close()
    }

    minimize() {
        let window = remote.BrowserWindow.getFocusedWindow();
        window.minimize()
    }

    toggleMaximize() {
        let window = remote.BrowserWindow.getFocusedWindow();
        this.setState({ isMaximized: !this.state.isMaximized })
        if(!this.state.isMaximized) {
            window.maximize()
        } else {
            window.unmaximize()
        }
    }

    render() {
        const baseStyle = React.CSSProperties = {
            margin: 10
        };

        // @todo Add this to the state and change it when the accent color changes in Windows
        let accentColor = electron.remote.systemPreferences.getAccentColor();


        return (
            <UWPThemeProvider
                theme={getTheme({
                    themeName: "dark",
                    accent: '#' + accentColor,
                    useFluentDesign: true
                })}
            >

                <Router>
                    <div style={{width: '100%', height: '100%', backgroundColor: '#1a1a1a'}}>
                        <TitleBar
                            title="SteamGridDB Manager"
                            controls
                            isMaximized={this.state.isMaximized}
                            onCloseClick={this.close}
                            onMinimizeClick={this.minimize}
                            onMaximizeClick={this.toggleMaximize}
                            onRestoreDownClick = {this.toggleMaximize}
                            background="#141414"
                            color="#fff"
                            theme="dark"
                        />

                        <div>
                            <Route path="*" render={(props) => {
                                let isDisabled;

                                if (props.location.pathname.indexOf('/search') === -1) {
                                    isDisabled = true;
                                } else {
                                    isDisabled = false;
                                }

                                return (
                                    <Link to='/games' style={{float: 'left'}}>
                                        <IconButton style={{fontSize: '18px', marginTop: '6px', background: 'none'}} disabled={isDisabled}>
                                            Back
                                        </IconButton>
                                    </Link>
                                )
                            }} />

                            <Tabs style={baseStyle}>
                                <Tab title="Library">
                                    <Redirect to="/games"/>
                                </Tab>
                            </Tabs>
                        </div>

                        <Route exact path="/games" component={Games} />
                        <Route exact path="/search" component={Search} />
                    </div>
                </Router>

                <ToastHandler />
            </UWPThemeProvider>

        )
    }
}

export default App;
