import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import AutoSuggestBox from 'react-uwp/AutoSuggestBox';
import AppBarButton from 'react-uwp/AppBarButton';
import AppBarSeparator from 'react-uwp/AppBarSeparator';
import Fuse from 'fuse.js';
import PubSub from 'pubsub-js';
import { debounce } from 'lodash';
import { forceCheck } from 'react-lazyload';
import queryString from 'query-string';
import Grid from './Components/Grid';
import Spinner from './Components/spinner';
import GridImage from './Components/gridImage';
import Steam from './Steam';
import TopBlur from './Components/TopBlur';
import platformModules from './importers';

const log = window.require('electron-log');

class Games extends React.Component {
  constructor(props) {
    super(props);
    this.toSearch = this.toSearch.bind(this);
    this.refreshGames = this.refreshGames.bind(this);
    this.filterGames = this.filterGames.bind(this);
    this.searchInput = debounce((searchTerm) => {
      this.filterGames(searchTerm);
    }, 300);

    const { location } = this.props;

    const qs = location && queryString.parse(location.search);
    this.scrollToTarget = qs.scrollto;

    this.zoom = 1;

    // Fetched games are stored here and shouldn't be changed unless a fetch is triggered again
    this.fetchedGames = {};
    this.platformNames = {
      steam: 'Steam',
      other: 'Other Games',
    };

    Object.keys(platformModules).forEach((module) => {
      this.platformNames[platformModules[module].id] = platformModules[module].name;
    });

    this.state = {
      isLoaded: false,
      toSearch: false,
      hasSteam: true,
      items: {},
    };
  }

  componentDidMount() {
    const { items } = this.state;

    if (Object.entries(items).length <= 0) {
      Steam.getSteamPath().then(() => {
        this.fetchGames();
      }).catch(() => {
        log.warn('Steam is not installed');
        this.setState({ hasSteam: false });
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (Object.entries(prevState.items).length === 0 && this.scrollToTarget) {
      this.scrollTo(this.scrollToTarget);
      PubSub.publish('showBack', false);
    }
  }

  fetchGames() {
    const steamGamesPromise = Steam.getSteamGames();
    const nonSteamGamesPromise = Steam.getNonSteamGames();
    Promise.all([steamGamesPromise, nonSteamGamesPromise]).then((values) => {
      const items = { steam: values[0], ...values[1] };
      // Sort games alphabetically
      Object.keys(items).forEach((platform) => {
        items[platform] = items[platform].sort((a, b) => {
          if (a.name > b.name) {
            return 1;
          }

          return ((b.name > a.name) ? -1 : 0);
        });
      });

      this.fetchedGames = items;
      this.setState({
        isLoaded: true,
        items,
      });
    });
  }

  toSearch(props) {
    const parsedQs = queryString.stringify({
      game: props.name,
      appid: props.appid,
      type: props.gameType,
      gameId: props.gameId,
      platform: props.platform,
    });

    const to = `/search/?${parsedQs}`;
    this.setState({ toSearch: <Redirect to={to} /> });
  }

  refreshGames() {
    this.setState({ isLoaded: false });
    this.fetchGames();
  }

  filterGames(searchTerm) {
    const items = { ...this.fetchedGames };
    if (searchTerm.trim() === '') {
      this.setState({ items });
      return;
    }

    Object.keys(items).forEach((platform) => {
      const fuse = new Fuse(items[platform], {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          'name',
        ],
      });
      items[platform] = fuse.search(searchTerm);
    });
    this.setState({ items });

    forceCheck(); // Recheck lazyload
  }

  addNoCache(imageURI) {
    if (!imageURI) {
      return false;
    }

    return `${imageURI}?${(new Date().getTime())}`;
  }

  scrollTo(id) {
    document.getElementById(`game-${id}`).scrollIntoView(true);
    document.querySelector('#grids-container').scrollTop -= 75; // scroll down a bit cause grid goes under floating launcher name
  }

  render() {
    const {
      isLoaded,
      hasSteam,
      items,
      toSearch,
    } = this.state;
    const { theme } = this.context;

    if (!hasSteam) {
      return (
        <h5 style={{ ...theme.typographyStyles.title, textAlign: 'center' }}>
          Steam installation not found.
        </h5>
      );
    }

    if (!isLoaded) {
      return <Spinner />;
    }

    if (toSearch) {
      return toSearch;
    }

    return (
      <div style={{ height: 'inherit', overflow: 'hidden' }}>
        <TopBlur additionalHeight={48} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'fixed',
            top: 30,
            width: 'calc(100vw - 55px)',
            height: 48,
            zIndex: 2,
          }}
        >
          <AutoSuggestBox style={{ marginLeft: 'auto', marginRight: 24 }} placeholder="Search" onChangeValue={this.searchInput} />
          <AppBarSeparator style={{ height: 24 }} />
          <AppBarButton
            icon="Refresh"
            label="Refresh"
            onClick={this.refreshGames}
          />
        </div>
        <div id="grids-container" style={{ height: '100%', overflow: 'auto', paddingTop: 64 }}>
          {Object.keys(items).map((platform) => (
            <div key={platform} style={{ paddingLeft: 10 }}>
              <div style={{
                ...theme.typographyStyles.subTitleAlt,
                display: 'inline-block',
                position: 'sticky',
                zIndex: 3,
                marginLeft: 10,
                top: -22,
              }}
              >
                {this.platformNames[platform]}
              </div>
              <Grid
                zoom={this.zoom}
                platform={platform}
              >
                {items[platform].map((item) => {
                  const imageURI = this.addNoCache((item.imageURI));
                  return (
                    // id attribute is used as a scroll target after a search
                    <div id={`game-${item.appid}`} key={item.appid}>
                      <GridImage
                        name={item.name}
                        gameId={item.gameId}
                        platform={platform}
                        appid={item.appid}
                        gameType={item.type}
                        image={imageURI}
                        zoom={this.zoom}
                        onGridClick={this.toSearch}
                      />
                    </div>
                  );
                })}
              </Grid>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

Games.propTypes = {
  location: PropTypes.object
};
Games.contextTypes = { theme: PropTypes.object };
export default Games;
