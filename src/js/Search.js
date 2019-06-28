import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import {Redirect} from "react-router-dom";
import Steam from "./Steam.js";
import React from "react";
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Grid from "./Grid";
import queryString from "query-string";
const SGDB = window.require('steamgriddb');
const path = window.require('path')
const https = window.require('https');
const fs = window.require('fs');
const Stream = window.require('stream').Transform
const Store = window.require('electron-store');

class Search extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = 1;
        this.store = new Store();

        const qs = this.props.location && queryString.parse(this.props.location.search);
        this.query = qs.game;
        this.appid = qs.appid;
        this.gameType = qs.type;

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
    }

    componentDidMount() {
        if (this.state.items.length <= 0) {
            this.searchGrids();
        }
    }

    // @todo This should be it's own class so we can use it during one-click downloads
    searchGrids() {
        const client = new SGDB(this.store.get('apiKey'));

        if (this.gameType === 'game') {
            client.getGridsBySteamAppId(this.appid)
                .then((res) => {
                    let items = res;
                    let defaultGridImage = Steam.getDefaultGridImage(this.appid);
                    items.unshift({
                        url: defaultGridImage,
                        thumb: defaultGridImage,
                        style: 'default',
                        title: this.query
                    });

                    this.setState({
                        isLoaded: true,
                        items: items
                    });
                })
                .catch((err) => {
                    this.setState({
                        apiError: true
                    });
                });
        }

        if (this.gameType === 'shortcut') {
            client.searchGame(this.query)
                .then((res) => {
                    client.getGridsById(res[0].id)
                        .then((res) => {
                            let items = res;
                            this.setState({
                                isLoaded: true,
                                items: items
                            });
                        });
                })
                .catch((err) => {
                    this.setState({
                        apiError: true
                    });
                });
        }
    }

    onClick() {
        if (this.props.getIsDownloading()) {
            return;
        }

        this.props.setIsDownloading(true);

        // @todo Move this into it's own function please
        Steam.getCurrentUserGridPath().then((userGridPath) => {
            let image_url = this.props.data.url;
            let image_ext = image_url.substr(image_url.lastIndexOf('.') + 1);
            let dest = path.join(userGridPath, this.props.appid + '.' + image_ext);
            // let file = fs.createWriteStream(dest);

            // @todo Delete current custom grid image (might be different extension
            // @todo Some sort of spinner to show that we're downloading the file
            let cur = 0;
            let data = new Stream();

            https.get(this.props.data.url, (response) => {
                let len = parseInt(response.headers['content-length'], 10);

                // @todo This shouldn't pipe because it can write partial images if there is an interruption
                // response.pipe(file);
                response.on('end', () => {


                    Steam.deleteCustomGridImage(userGridPath, this.props.appid);

                    fs.writeFileSync(dest, data.read());
                    // file.close();

                    this.props.setImageDownloaded(this.props.name, dest);
                });

                response.on('data', (chunk) => {
                    cur += chunk.length;
                    data.push(chunk);
                    this.setState({downloadProgress: (cur / len)});
                });
            }).on('error', (err) => { // Handle errors
                // @todo Something to show that there was an error downloading the file, perhaps use the toast
                this.props.setIsDownloading(false);
                fs.unlink(dest);
            });
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
            let url = `/games/?success=true&game=${this.state.imageDownloaded.game}&image=${this.state.imageDownloaded.image}`;
            console.log('redirecing to games');
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
                    <p style={{...getTheme().typographyStyles.base, textAlign: 'center', color: getTheme().baseMedium}}>
                        Please check your API key in the settings tab.
                    </p>
                </div>
            )
        }

        if (!isLoaded) {
            // @todo Does the spinner already put a width 100% div in?
            return (<Spinner/>);
        }

        return (
            <Grid zoom={this.zoom}>
                {items.map((item, i) => (
                    <GridImage
                        name={this.query}
                        image={item.thumb}
                        zoom={this.zoom}
                        onClick={this.onClick}
                        appid={this.appid}
                        setImageDownloaded={this.setImageDownloaded}
                        getIsDownloading={this.getIsDownloading}
                        setIsDownloading={this.setIsDownloading}
                        data={item}
                        key={i}
                    />
                ))}
            </Grid>
        )
    }
}

export default Search;
