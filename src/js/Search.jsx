import React from 'react';
import { Redirect } from 'react-router-dom';
import Image from 'react-uwp/Image';
import queryString from 'query-string';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import Grid from './Components/Grid';
import TopBlur from './Components/TopBlur';
import Spinner from './Components/spinner';
import GridImage from './Components/gridImage';
import { officialList } from './importers';
import Steam from './Steam';

const SGDB = window.require('steamgriddb');
const Store = window.require('electron-store');

class Search extends React.Component {
  constructor(props) {
    super(props);
    const { location } = this.props;

    this.applyGrid = this.applyGrid.bind(this);
    this.zoom = 1;
    this.store = new Store();

    const qs = location && queryString.parse(location.search);
    this.game = qs.game;
    this.query = qs.game;
    this.appid = qs.appid;
    this.gameType = qs.type;
    this.platform = qs.platform;
    this.gameId = qs.gameId;

    this.state = {
      error: null,
      apiError: false,
      isLoaded: false,
      isHover: false,
      isDownloading: false,
      imageDownloaded: false,
      items: [],
    };

    this.setImageDownloaded = this.setImageDownloaded.bind(this);
    this.setIsDownloading = this.setIsDownloading.bind(this);
    this.getIsDownloading = this.getIsDownloading.bind(this);

    PubSub.publish('showBack', true);
  }

  componentDidMount() {
    const { items } = this.state;
    if (items.length <= 0) {
      this.searchGrids();
    }
  }

  setIsDownloading(isDownloading) {
    this.setState({ isDownloading });
  }

  getIsDownloading() {
    const { isDownloading } = this.state;
    return isDownloading;
  }

  setImageDownloaded(appid, game, image) {
    this.setState({
      imageDownloaded: { appid, game, image },
      isDownloading: false,
    });
  }

  applyGrid(props) {
    if (this.getIsDownloading()) {
      return;
    }

    this.setIsDownloading(true);
    const itemsClone = { ...this.state.items };
    Steam.addGrid(props.appid, props.image, (progress) => {
      this.setState({ downloadProgress: progress });
      itemsClone[props.index].progress = progress;
      this.setState({ itemsClone });
    }).then((dest) => {
      this.setImageDownloaded(props.appid, props.name, dest);
    }).catch(() => {
      this.setIsDownloading(false);
    });
  }

  searchGrids() {
    const client = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');

    if (this.gameType === 'game') {
      const defaultGridImage = Steam.getDefaultGridImage(this.appid);
      const items = [{
        url: defaultGridImage,
        thumb: defaultGridImage,
        style: 'default',
        title: this.query,
        author: {
          name: null,
        },
      }];
      client.getGridsBySteamAppId(this.appid)
        .then((res) => {
          this.setState({
            isLoaded: true,
            items: [...items, ...res],
          });
        })
        .catch((err) => {
          if (err.response.statusCode === 404) {
            // Game not found is fine
            this.setState({
              isLoaded: true,
              items,
            });
          } else {
            // Any other error is baad
            this.setState({ apiError: true });
          }
        });
    }

    if (this.gameType === 'shortcut' && officialList.includes(this.platform)) {
      client.getGrids({ id: this.gameId, type: this.platform })
        .then((items) => {
          this.setState({
            isLoaded: true,
            items,
          });
        })
        .catch(() => {
          this.setState({
            apiError: true,
          });
        });
    } else if (this.gameType === 'shortcut' && !officialList.includes(this.platform)) {
      client.searchGame(this.query)
        .then((res) => {
          client.getGridsById(res[0].id)
            .then((items) => {
              this.setState({
                isLoaded: true,
                items,
              });
            });
        }).catch(() => {
          this.setState({ apiError: true });
        });
    }
  }

  render() {
    const {
      isLoaded,
      items,
      apiError,
      imageDownloaded,
    } = this.state;
    const { theme } = this.context;

    if (imageDownloaded) {
      const url = `/?scrollto=${imageDownloaded.appid}`;

      // Show toast
      PubSub.publish('toast', {
        logoNode: 'Download',
        title: `Success: ${imageDownloaded.game}`,
        contents: (
          <Image
            style={{ width: '100%', marginTop: 10 }}
            src={imageDownloaded.image}
          />
        ),
      });

      return (
        <div>
          <Redirect to={url} />
        </div>
      );
    }

    if (!isLoaded) {
      return (<Spinner />);
    }

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
          {apiError ? (
            <div>
              <h5 style={{ ...theme.typographyStyles.title, textAlign: 'center' }}>
                Error trying to use the SteamGridDB API.
              </h5>
            </div>
          ) : (
            <Grid zoom={this.zoom}>
              {items.map((item, i) => {
                let { progress } = item;
                if (typeof item.progress === 'undefined') {
                  progress = 0;
                }
                return (
                  <GridImage
                    key={i}
                    index={i}
                    appid={this.appid}
                    name={this.game}
                    author={item.author.name}
                    image={item.thumb}
                    zoom={this.zoom}
                    progress={progress}
                    onGridClick={this.applyGrid}
                    data={item}
                  />
                );
              })}
            </Grid>
          )}
        </div>
      </>
    );
  }
}

Search.propTypes = {
  location: PropTypes.object
};
Search.contextTypes = { theme: PropTypes.object };
export default Search;
