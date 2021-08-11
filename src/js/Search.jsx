import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import Image from 'react-uwp/Image';
import Button from 'react-uwp/Button';
import PubSub from 'pubsub-js';
import TopBlur from './Components/TopBlur';
import Spinner from './Components/spinner';
import Steam from './Steam';
import AppBarButton from 'react-uwp/AppBarButton';
import AppBarSeparator from 'react-uwp/AppBarSeparator';

const SGDB = window.require('steamgriddb');
const {dialog} = window.require('electron').remote;

class Search extends React.Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
    this.onRemove = this.onRemove.bind(this);
    this.onPickFile = this.onPickFile.bind(this);
    this.SGDB = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');

    const { location } = this.props;

    this.state = {
      game: location.state,
      items: [],
      toGame: false,
      isLoaded: false,
    };

    PubSub.publish('showBack', true);
  }

  componentDidMount() {
    const { game } = this.state;

    let type = 'steam';
    if (game.platform) {
      type = game.platform;
    }

    let id;
    if (game.platform) {
      id = game.gameId;
    } else {
      id = game.appid;
    }

    if (game.platform === 'other') {
      type = 'game';
      this.SGDB.searchGame(game.name)
        .then((gameResp) => {
          id = gameResp[0].id;
          this.queryApi(type, id);
        });
    } else {
      this.queryApi(type, id)
      .catch((err) => {
        type = 'game';
        this.SGDB.searchGame(game.name)
          .then((gameResp) => {
            id = gameResp[0].id;
            this.queryApi(type, id);
          });
      });
    }
  }

  onClick(item, itemIndex) {
    const { game, items } = this.state;
    const { location } = this.props;

    const clonedItems = [...items];
    clonedItems[itemIndex].downloading = true;

    this.setState({
      items: clonedItems,
    });

    Steam.addAsset(location.state.assetType, game.appid, item.url).then(() => {
      clonedItems[itemIndex].downloading = false;
      this.setState({
        items: clonedItems,
      });
      this.setState({ toGame: <Redirect to={{ pathname: '/game', state: location.state }} /> });
    });
  }

  onRemove() {
    const { game } = this.state;
    const { location } = this.props;

    Steam.removeAsset(location.state.assetType, game.appid).then(() => {
      PubSub.publish('toast', {
        logoNode: 'CheckMark',
        title: 'Successfully Removed!',
        contents: (
          <p>
            Asset is set to the original image.
          </p>
        ),
      });
      this.setState({ toGame: <Redirect to={{ pathname: '/game', state: location.state }} /> });
    });
  }

  onPickFile () {
    const { game, items } = this.state;
    const { location } = this.props;
    const self = this;

    dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      ]
    }, function (files) {
        if (files !== undefined && files.length) {
          
          Steam.addAsset(location.state.assetType, game.appid, files[0]).then(() => {

            self.setState({ toGame: <Redirect to={{ pathname: '/game', state: location.state }} /> });
          });
        }            
    });
  }

  queryApi(type, id) {
    const { location } = this.props;

    switch (location.state.assetType) {
    case 'horizontalGrid':
      return this.SGDB.getGrids({ type, id }).then((res) => {
        this.setState({
          isLoaded: true,
          items: res,
        });
      });
      break;
    case 'verticalGrid':
      return this.SGDB.getGrids({ type, id, dimensions: ['600x900'] }).then((res) => {
        this.setState({
          isLoaded: true,
          items: res,
        });
      });
      break;
    case 'hero':
      return this.SGDB.getHeroes({ type, id }).then((res) => {
        this.setState({
          isLoaded: true,
          items: res,
        });
      });
      break;
    case 'logo':
      return this.SGDB.getLogos({ type, id }).then((res) => {
        this.setState({
          isLoaded: true,
          items: res,
        });
      });
      break;
    default:
      break;
    }
  }

  render() {
    const { isLoaded, toGame, items } = this.state;
    const { theme } = this.context;

    if (!isLoaded) {
      return <Spinner />;
    }

    if (toGame) {
      return toGame;
    }

    return (
      <div style={{ height: 'inherit', overflow: 'hidden' }}>
        <TopBlur additionalHeight={48} />
        <div
          style={{
            display: 'flex',
            alignItems: 'right',
            position: 'fixed',
            top: 30,
            width: 'calc(100vw - 55px)',
            height: 48,
            zIndex: 2,
          }}
        >
          <div style={{ marginLeft: 'auto', marginRight: 24 }} />
          <AppBarButton
            icon="Delete"
            label="Reset"
            onClick={this.onRemove}
          />
          <AppBarSeparator style={{ height: 24 }} />
          <AppBarButton
            icon="Add"
            label="Custom Image"
            onClick={this.onPickFile}
          />
        </div>
        <div
          id="search-container"
          style={{
            height: '100%',
            overflow: 'auto',
            padding: 15,
            paddingLeft: 10,
            paddingTop: 45,
            marginTop: 48,
          }}
        >
          {items.map((item, i) => (
            <Button
              key={item.id}
              style={{ padding: 0, margin: 5 }}
              onClick={() => this.onClick(item, i)}
            >
              {item.downloading ? (
                <div style={{ position: 'relative' }}>
                  <Spinner size={70} style={{ position: 'absolute', background: 'rgba(0,0,0,.5)' }} />
                  <Image
                    style={{
                      width: '100%',
                      height: 'auto',
                    }}
                    src={item.thumb}
                  />
                </div>
              ) : (
                <Image
                  style={{
                    width: '100%',
                    height: 'auto',
                  }}
                  src={item.thumb}
                />
              )}
              <p style={{ ...theme.typographyStyles.captionAlt, padding: 5 }}>
                <Image style={{ height: 20, marginRight: 5 }} src={item.author.avatar} />
                {item.author.name}
              </p>
            </Button>
          ))}
        </div>
      </div>
    );
  }
}

Search.propTypes = {
  location: PropTypes.object.isRequired,
};
Search.contextTypes = { theme: PropTypes.object };
export default Search;
