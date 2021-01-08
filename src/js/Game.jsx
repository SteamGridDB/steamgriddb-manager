import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import Image from 'react-uwp/Image';
import Button from 'react-uwp/Button';
import PubSub from 'pubsub-js';
import TopBlur from './Components/TopBlur';
import Steam from './Steam';
import heroPlaceholder from '../img/hero_none.png';
import capsuleVerticalPlaceholder from '../img/capsule_vertical_none.png';
import capsulePlaceholder from '../img/capsule_none.png';
import logoPlaceholder from '../img/logo_none.png';

const { join } = window.require('path');
const fs = window.require('fs');

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.toSearch = this.toSearch.bind(this);

    const { location } = this.props;

    this.state = {
      game: location.state,
      toSearch: false,
      grid: null,
      poster: null,
      hero: null,
      logo: null,
    };

    PubSub.publish('showBack', true);
  }

  componentDidMount() {
    const { game } = this.state;
    const self = this;

    Steam.getSteamPath().then((steamPath) => {
      Steam.getLoggedInUser().then((user) => {
        const userdataGridPath = join(steamPath, 'userdata', String(user), 'config', 'grid');

        let grid = Steam.getCustomImage('horizontalGrid', userdataGridPath, game.appid);
        let poster = Steam.getCustomImage('verticalGrid', userdataGridPath, game.appid);
        let hero = Steam.getCustomImage('hero', userdataGridPath, game.appid);
        let logo = Steam.getCustomImage('logo', userdataGridPath, game.appid);

        // Find defaults from the cache if it doesn't exist
        const librarycachePath = join(steamPath, 'appcache', 'librarycache');

        if (!grid && fs.existsSync(join(librarycachePath, `${game.appid}_header.jpg`))) {
          grid = join(librarycachePath, `${game.appid}_header.jpg`);
        }

        if (!poster && fs.existsSync(join(librarycachePath, `${game.appid}_library_600x900.jpg`))) {
          poster = join(librarycachePath, `${game.appid}_library_600x900.jpg`);
        }

        if (!hero && fs.existsSync(join(librarycachePath, `${game.appid}_library_hero.jpg`))) {
          hero = join(librarycachePath, `${game.appid}_library_hero.jpg`);
        }

        if (!logo && fs.existsSync(join(librarycachePath, `${game.appid}_logo.png`))) {
          logo = join(librarycachePath, `${game.appid}_logo.png`);
        }

        self.setState({
          grid,
          poster,
          hero,
          logo,
        });
      });
    });
  }

  toSearch(assetType) {
    const { location } = this.props;
    this.setState({ toSearch: <Redirect to={{ pathname: '/search', state: { ...location.state, assetType } }} /> });
  }

  addNoCache(imageURI) {
    if (!imageURI) {
      return false;
    }

    return `${imageURI}?${(new Date().getTime())}`;
  }

  render() {
    const {
      toSearch,
      game,
      grid,
      hero,
      poster,
      logo,
    } = this.state;

    if (toSearch) {
      return toSearch;
    }

    const { theme } = this.context;
    const titleStyle = {
      ...theme.typographyStyles.subTitle,
      padding: '20px 0px 10px 0',
      width: '100%',
    };
    const buttonStyle = {
      padding: 0,
    };

    return (
      <>
        <TopBlur />
        <div
          id="search-container"
          style={{
            height: '100%',
            overflow: 'auto',
            padding: 15,
            paddingLeft: 10,
            paddingTop: 45,
          }}
        >
          <h1 style={theme.typographyStyles.header}>{game.name}</h1>
          <h5 style={titleStyle}>Hero</h5>
          <Button style={buttonStyle} onClick={() => this.toSearch('hero')}>
            <Image
              style={{
                width: '100%',
                height: 'auto',
              }}
              src={this.addNoCache(hero) || heroPlaceholder}
            />
          </Button>

          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <h5 style={titleStyle}>Vertical Capsule</h5>
              <Button style={buttonStyle} onClick={() => this.toSearch('verticalGrid')}>
                <Image
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  src={this.addNoCache(poster) || capsuleVerticalPlaceholder}
                />
              </Button>
            </div>
            <div
              style={{
                marginLeft: 10,
                flex: 1,
              }}
            >
              <h5 style={titleStyle}>Horizontal Capsule</h5>
              <Button style={buttonStyle} onClick={() => this.toSearch('horizontalGrid')}>
                <Image
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  src={this.addNoCache(grid) || capsulePlaceholder}
                />
              </Button>
            </div>
          </div>
          <div>
            <h5 style={titleStyle}>Logo</h5>
            <Button style={buttonStyle} onClick={() => this.toSearch('logo')}>
              <Image
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
                src={this.addNoCache(logo) || logoPlaceholder}
              />
            </Button>
          </div>
        </div>
      </>
    );
  }
}

Game.propTypes = {
  location: PropTypes.object.isRequired,
};
Game.contextTypes = { theme: PropTypes.object };
export default Game;
