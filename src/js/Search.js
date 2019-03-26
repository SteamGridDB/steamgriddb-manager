import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import {Redirect} from "react-router-dom";
import Steam from "./Steam.js";
import React from "react";
import Grid from "./Grid";
import queryString from "query-string";
const path = window.require('path')
const https = window.require('https');
const fs = window.require('fs');
const Stream = window.require('stream').Transform

class Search extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = 1;

        const qs = this.props.location && queryString.parse(this.props.location.search);
        this.query = qs.game;
        this.appid = qs.appid;
        this.gameType = qs.type;

        this.state = {
            error: null,
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
        fetch(`http://www.steamgriddb.com/api/grids/?game=${this.query}`, {headers: {"Content-Type": "application/json; charset=utf-8"}})
        .then(res => res.json())
        .then(response => {
            let items = response.data;

            if (this.gameType === 'game') {
                let defaultGridImage = Steam.getDefaultGridImage(this.appid);
                items.unshift({
                    grid_url: defaultGridImage,
                    grid_url_thumbnail: defaultGridImage,
                    style: 'default',
                    title: this.query
                })
            }

            this.setState({
                isLoaded: true,
                items: items
            });
        })
        .catch(err => {
            // @todo Need to show a "Error" screen here
            console.error(err);
            alert("Sorry, there was an error searching.");
        });
    }

    onClick() {
        if (this.props.getIsDownloading()) {
            return;
        }

        this.props.setIsDownloading(true);

        // @todo Move this into it's own function please
        Steam.getCurrentUserGridPath().then((userGridPath) => {
            let image_url = this.props.data.grid_url;
            let image_ext = image_url.substr(image_url.lastIndexOf('.') + 1);
            let dest = path.join(userGridPath, this.props.appid + '.' + image_ext);
            // let file = fs.createWriteStream(dest);

            // @todo Delete current custom grid image (might be different extension
            // @todo Some sort of spinner to show that we're downloading the file
            let cur = 0;
            let data = new Stream();

            https.get(this.props.data.grid_url, (response) => {
                let len = parseInt(response.headers['content-length'], 10);

                // @todo This shouldn't pipe because it can write partial images if there is an interruption
                // response.pipe(file);
                response.on('end', () => {


                    Steam.deleteCustomGridImage(userGridPath, this.props.appid);

                    fs.writeFileSync(dest, data.read());
                    // file.close();

                    this.props.setImageDownloaded(this.props.data.title, dest);
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

        if (!isLoaded) {
            // @todo Does the spinner already put a width 100% div in?
            return (<Spinner/>);
        }

        return (
            <Grid zoom={this.zoom}>
                {items.map((item, i) => (
                    <GridImage
                        name={item.name}
                        image={item.grid_url_thumbnail}
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
