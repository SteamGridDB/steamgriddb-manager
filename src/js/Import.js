const Store = window.require('electron-store');
import React from 'react';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Tabs, { Tab } from "react-uwp/Tabs";
import TextBox from "react-uwp/TextBox";
import Spinner from './spinner.js';
import Origin from "./Origin";

class Import extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoaded: false
        };
    }

    componentDidMount() {
        Origin.isInstalled().then((installed) => {
            if (installed) {
                Origin.getOriginGames().then((games) => {
                    this.setState({
                        isLoaded: true,
                        items: games
                    });
                });
            }
        });

    }

    render() {
        const {isLoaded} = this.state;

        if (!isLoaded) {
            return (<Spinner/>);
        }

        return (
            <Tabs>
                <Tab title="Origin">
                    Origin
                </Tab>
                <Tab title="UPlay">
                    UPlay
                </Tab>
                <Tab title="GOG">
                    GOG
                </Tab>
                <Tab title="Epic Games Store">
                    Epic Games Store
                </Tab>
            </Tabs>
        );
    }
}

export default Import;
