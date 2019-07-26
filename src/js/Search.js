import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import {Redirect} from 'react-router-dom';
import Steam from './Steam.js';
import React from 'react';
import {getTheme} from 'react-uwp/Theme';
import Image from 'react-uwp/Image';
import Grid from './Grid';
import queryString from 'query-string';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
const SGDB = window.require('steamgriddb');
const Store = window.require('electron-store');

class Search extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = 1;
        this.store = new Store();

        const qs = this.props.location && queryString.parse(this.props.location.search);
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
            items: []
        };

        this.setImageDownloaded = this.setImageDownloaded.bind(this);
        this.setIsDownloading = this.setIsDownloading.bind(this);
        this.getIsDownloading = this.getIsDownloading.bind(this);

        PubSub.publish('showBack', true);
    }

    componentDidMount() {
        if (this.state.items.length <= 0) {
            this.searchGrids();
        }
    }

    // @todo This should be it's own class so we can use it during one-click downloads
    searchGrids() {
        const client = new SGDB('b971a6f5f280490ab62c0ee7d0fd1d16');

        if (this.gameType === 'game') {
            client.getGridsBySteamAppId(this.appid)
                .then((res) => {
                    const items = res;
                    const defaultGridImage = Steam.getDefaultGridImage(this.appid);
                    items.unshift({
                        url: defaultGridImage,
                        thumb: defaultGridImage,
                        style: 'default',
                        title: this.query,
                        author: {
                            name: null
                        }
                    });

                    this.setState({
                        isLoaded: true,
                        items: items
                    });
                })
                .catch(() => {
                    this.setState({
                        apiError: true
                    });
                });
        }

        if (this.gameType === 'shortcut' && this.platform !== 'other') {
            client.getGame({
                type: this.platform,
                id: this.gameId
            }).then((res) => {
                client.getGridsById(res.id)
                    .then((items) => {
                        this.setState({
                            isLoaded: true,
                            items: items
                        });
                    });
            }).catch(() => {
                this.setState({
                    apiError: true
                });
            });
        }

        if (this.gameType === 'shortcut' && this.platform === 'other') {
            client.searchGame(this.query)
                .then((res) => {
                    client.getGridsById(res[0].id)
                        .then((items) => {
                            this.setState({
                                isLoaded: true,
                                items: items
                            });
                        });
                }).catch(() => {
                    this.setState({
                        apiError: true
                    });
                });
        }
    }

    // This is executed from the gridImage component
    onClick() {
        /* eslint-disable react/prop-types */
        if (this.props.getIsDownloading()) {
            return;
        }

        this.props.setIsDownloading(true);
        Steam.addGrid(this.props.appid, this.props.data.url, (progress) => {
            this.setState({downloadProgress: progress});
        }).then((dest) => {
            this.props.setImageDownloaded(this.props.name, dest);
        }).catch(() => {
            this.props.setIsDownloading(false);
        });
    }

    setIsDownloading(isDownloading) {
        this.setState({isDownloading: isDownloading});
    }

    getIsDownloading() {
        return this.state.isDownloading;
    }

    setImageDownloaded(game, image) {
        this.setState({
            imageDownloaded: {
                game: game,
                image: image
            },
            isDownloading: false
        });
    }

    render() {
        const {isLoaded, items} = this.state;

        if (this.state.imageDownloaded) {
            const url = `/?game=${this.state.imageDownloaded.game}&image=${this.state.imageDownloaded.image}`;

            // Show toast
            PubSub.publish('toast', {logoNode: 'Download', title: `Success: ${this.state.imageDownloaded.game}`, contents: (
                <Image
                    style={{width: '100%', marginTop: 10}}
                    src={this.state.imageDownloaded.image}
                />
            )});

            return (
                <div>
                    <Redirect to={url} />
                </div>
            );
        }

        if (this.state.apiError) {
            return (
                <div>
                    <h5 style={{...getTheme().typographyStyles.title, textAlign: 'center'}}>
                        Error trying to use the SteamGridDB API. 
                    </h5>
                </div>
            );
        }

        if (!isLoaded) {
            return (<Spinner/>);
        }

        return (
            <Grid zoom={this.zoom}>
                {items.map((item, i) => (
                    <GridImage
                        key={i}
                        appid={this.appid}
                        name={this.game}
                        author={item.author.name}
                        image={item.thumb}
                        zoom={this.zoom}
                        onClick={this.onClick}
                        setImageDownloaded={this.setImageDownloaded}
                        getIsDownloading={this.getIsDownloading}
                        setIsDownloading={this.setIsDownloading}
                        data={item}
                    />
                ))}
            </Grid>
        );
    }
}

Search.propTypes = {
    location: PropTypes.object
};

export default Search;
