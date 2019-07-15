const Store = window.require('electron-store');
import React from 'react';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Image from "react-uwp/Image";
import TextBox from "react-uwp/TextBox";

class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            hasSteam: true
        };
        this.store = new Store();
        this.apiKey = '';
        if (this.store.get('apiKey')) {
            this.apiKey = this.store.get('apiKey');
        }
    }

    setApiKey(e) {
        let key = e.target.value.trim();
        this.store.set('apiKey', key);
    }

    render() {
        const baseStyle = React.CSSProperties = {
            margin: '10px 0'
        };

        const descStyle = {
            ...
            getTheme().typographyStyles.base,
            color: getTheme().baseMedium
        };

        return (
            <div>
                <h5 style={getTheme().typographyStyles.subTitle}>API Key</h5>
                <p style={descStyle}>
                    Your API key can be found in your preferences page on steamgriddb.com.
                </p>
                <TextBox style={baseStyle} defaultValue={this.apiKey} onChange={this.setApiKey.bind(this)} />
            </div>
        )
    }
}

export default Settings;
