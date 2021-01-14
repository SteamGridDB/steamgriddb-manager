import React from 'react';
import { TitleBar } from 'react-desktop/windows';
import { Theme as UWPThemeProvider, getTheme } from 'react-uwp/Theme';
import NavigationView from 'react-uwp/NavigationView';
import SplitViewCommand from 'react-uwp/SplitViewCommand';
import { IconButton } from 'react-uwp';
import PubSub from 'pubsub-js';
import {
  HashRouter as Router,
  Redirect,
  Link,
  Route,
} from 'react-router-dom';
import ToastHandler from './Components/toastHandler';

import UWPNoise from '../img/uwp-noise.png';
import '../css/App.css';
import Games from './games';
import Game from './Game';
import Import from './Import';
import Search from './Search';

import Steam from './Steam';

// Using window.require so babel doesn't change the node require
const electron = window.require('electron');
const { remote } = electron;

// Log renderer errors
const log = window.require('electron-log');
log.catchErrors({ showDialog: true });

window.Steam = Steam;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = { isMaximized: false, showBack: false };
    this.toggleMaximize = this.toggleMaximize.bind(this);

    // Track windows snap calling maximize / unmaximize
    const window = remote.getCurrentWindow();

    window.on('maximize', () => {
      this.setState({ isMaximized: true });
    });

    window.on('unmaximize', () => {
      this.setState({ isMaximized: false });
    });

    PubSub.subscribe('showBack', (message, args) => {
      this.setState({ showBack: args });
    });
  }

  toggleMaximize() {
    const { isMaximized } = this.state;
    const window = remote.getCurrentWindow();
    this.setState({ isMaximized: !isMaximized });
    if (!isMaximized) {
      window.maximize();
    } else {
      window.unmaximize();
    }
  }

  handleNavRedirect(path) {
    this.setState({ redirectTo: path });
  }

  minimize() {
    remote.getCurrentWindow().minimize();
  }

  close() {
    remote.getCurrentWindow().close();
  }

  render() {
    const accentColor = remote.systemPreferences.getAccentColor();
    const navWidth = 48;
    const { showBack, isMaximized, redirectTo } = this.state;

    const navigationTopNodes = [
      <SplitViewCommand key="0" label="Library" icon="Library" onClick={() => this.handleNavRedirect('/')} />,
      <SplitViewCommand key="1" label="Import Games" icon="ImportAll" onClick={() => this.handleNavRedirect('/import')} />,
    ];

    let backBtn;
    let titleWidth = '100%';
    if (showBack) {
      backBtn = (
        <Link
          to="/"
          onClick={() => {
            this.setState({ showBack: false });
          }}
        >
          <IconButton
            style={{
              display: 'block',
              position: 'relative',
              float: 'left',
              width: navWidth,
              height: 30,
              lineHeight: '31px',
              backgroundColor: '#141414',
              zIndex: 2,
            }}
            size={22}
          >
            Back
          </IconButton>
        </Link>
      );
      titleWidth = `calc(100% - ${navWidth}px)`;
    }

    return (
      <UWPThemeProvider
        theme={getTheme({
          themeName: 'dark',
          accent: `#${accentColor}`,
          useFluentDesign: true,
        })}
      >
        <Router>
          <div style={{ backgroundColor: '#1a1a1a' }}>
            {backBtn}
            <TitleBar
              title="SteamGridDB Manager"
              style={{
                position: 'relative',
                top: 0,
                width: titleWidth,
                height: 30,
                zIndex: 2,
              }}
              controls
              isMaximized={isMaximized}
              onCloseClick={this.close}
              onMinimizeClick={this.minimize}
              onMaximizeClick={this.toggleMaximize}
              onRestoreDownClick={this.toggleMaximize}
              background="transparent"
              color="#fff"
              theme="dark"
            />
            <NavigationView
              style={{
                position: 'absolute',
                top: 0,
                height: 'calc(100vh - 30px)',
                width: '100%',
              }}
              paneStyle={{
                marginTop: 30,
                backgroundColor: 'rgba(0,0,0,.2)',
                backgroundImage: `url(${UWPNoise})`,
                backdropFilter: 'blur(20px)',
              }}
              background="transparent"
              displayMode="overlay"
              autoResize={false}
              initWidth={navWidth}
              navigationTopNodes={navigationTopNodes}
              focusNavigationNodeIndex={0}
            >
              <div style={{
                ...getTheme().typographyStyles.base,
                marginLeft: navWidth,
                height: '100%',
                position: 'relative',
                overflow: 'auto',
                zIndex: 0,
              }}
              >
                {redirectTo && <Redirect to={redirectTo} />}

                <Route exact path="/" component={Games} />
                <Route exact path="/import" component={Import} />
                <Route exact path="/game" component={Game} />
                <Route exact path="/search" component={Search} />

              </div>
            </NavigationView>
          </div>
        </Router>

        <ToastHandler />
      </UWPThemeProvider>
    );
  }
}

export default App;
