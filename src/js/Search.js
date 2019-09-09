import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import {Redirect} from 'react-router-dom';
import Steam from './Steam.js';
import React from 'react';
import Image from 'react-uwp/Image';
import Grid from './Grid';
import TopBlur from './TopBlur';
import queryString from 'query-string';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import {officialList} from './importers';
const SGDB = window.require('steamgriddb');
const Store = window.require('electron-store');

class Search extends React.Component {
    constructor(props) {
        super(props);

        this.applyGrid = this.applyGrid.bind(this);
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
            const defaultGridImage = Steam.getDefaultGridImage(this.appid);
            const items = [{
                url: defaultGridImage,
                thumb: defaultGridImage,
                style: 'default',
                title: this.query,
                author: {
                    name: null
                }
            }];
            client.getGridsBySteamAppId(this.appid)
                .then((res) => {
                    this.setState({
                        isLoaded: true,
                        items: [...items, ...res]
                    });
                })
                .catch((err) => {
                    if (err.response.statusCode === 404) {
                        // Game not found is fine
                        this.setState({
                            isLoaded: true,
                            items: items
                        });
                    } else {
                        // Any other error is baad
                        this.setState({
                            apiError: true
                        });
                    }
                });
        }

        if (this.gameType === 'shortcut' && officialList.includes(this.platform)) {
            client.getGrids({id: this.gameId, type: this.platform})
                .then((items) => {
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
        } else if (this.gameType === 'shortcut' && !officialList.includes(this.platform)) {
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

    applyGrid(props) {
        if (this.getIsDownloading()) {
            return;
        }

        this.setIsDownloading(true);
        const itemsClone = Object.assign({}, this.state.items);
        Steam.addGrid(props.appid, props.image, (progress) => {
            this.setState({downloadProgress: progress});
            itemsClone[props.index].progress = progress;
            this.setState({itemsClone});
        }).then((dest) => {
            this.setImageDownloaded(props.appid, props.name, dest);
        }).catch(() => {
            this.setIsDownloading(false);
        });
    }

    setIsDownloading(isDownloading) {
        this.setState({isDownloading: isDownloading});
    }

    getIsDownloading() {
        return this.state.isDownloading;
    }

    setImageDownloaded(appid, game, image) {
        this.setState({
            imageDownloaded: {
                appid: appid,
                game: game,
                image: image
            },
            isDownloading: false
        });
    }

    render() {
        const {isLoaded, items} = this.state;

        if (this.state.imageDownloaded) {
            const url = `/?scrollto=${this.state.imageDownloaded.appid}`;

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

        if (!isLoaded) {
            return (<Spinner/>);
        }

        return (
            <>
                <TopBlur/>
                <div id="search-container" style={{height: '100%', overflow: 'auto', padding: 15, paddingLeft: 10, paddingTop: 45}}>
                    {this.state.apiError ? (
                        <div>
                            <h5 style={{...this.context.theme.typographyStyles.title, textAlign: 'center'}}>
                                Error trying to use the SteamGridDB API. 
                            </h5>
                        </div>
                    ) : (
                        <Grid zoom={this.zoom}>
                            {items.map((item, i) => {
                                let progress = item.progress;
                                if (typeof item.progress == 'undefined') {
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
