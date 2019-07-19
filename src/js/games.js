import React from 'react';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import queryString from 'query-string';
import Image from "react-uwp/Image";
import AutoSuggestBox from "react-uwp/AutoSuggestBox";
import Grid from "./Grid";
import * as PubSub from "pubsub-js";
import Steam from "./Steam";

class Games extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = 1;
        this.platformNames = {
            'steam': 'Steam',
            'unknown': 'Unknown Games',
            'origin': 'Origin',
            'uplay': 'Uplay',
            'egs': 'Epic Games Launcher',
            'gog': 'GOG.com'
        };

        this.state = {
            error: null,
            isLoaded: false,
            isHover: false,
            toSearch: false,
            hasSteam: true,
            items: {}
        };

        const qs = this.props.location && queryString.parse(this.props.location.search);

        if (qs.success) {
            this.state.success = {
                game: qs.game,
                image: qs.image
            }
        }
    }

    componentDidMount() {
        if (Object.entries(this.state.items).length <= 0) {
            Steam.getSteamPath().then(() => {
                this.fetchGames();
            }).catch((err) => {
                this.setState({
                    hasSteam: false
                });
            });
        }
    }

    fetchGames() {
        let self = this;

        let steamGamesPromise = Steam.getSteamGames();
        let nonSteamGamesPromise = Steam.getNonSteamGames();
        Promise.all([steamGamesPromise, nonSteamGamesPromise]).then((values) => {
            this.setState({
                isLoaded: true,
                items: {
                    steam: values[0],
                    ...values[1]
                }
            })
        });
    }

    onClick() {
        this.setState({toSearch: true});
    }

    filterGames(searchTerm) {
        console.log(value);
    }

    addNoCache(imageURI) {
        if (!imageURI) {
            return false;
        }

        return `${imageURI}?${(new Date().getTime())}`;
    }

    render() {
        const {isLoaded, hasSteam, items} = this.state;

        if (!hasSteam) {
            return (
                <h5 style={{...getTheme().typographyStyles.title, textAlign: 'center'}}>
                    Steam installation not found.
                </h5>
            )
        }

        if (this.state.success) {
            let title = `Success: ${this.state.success.game}`;

            PubSub.publish('toast', {logoNode: 'Download', title: title, contents: (
                <Image
                    style={{width: "100%", marginTop: 10}}
                    src={this.addNoCache(this.state.success.image)}
                />
            )});
        }

        if (!isLoaded) {
            return <Spinner/>
        }

        return (
            <div style={{height: 'inherit', overflow: 'hidden'}}>
                <div style={{
                    height: 32,
                    width: '100%',
                    margin: '10px 0'
                }}>
                    <AutoSuggestBox
                        placeholder='Search'
                        onChangeValue={this.filterGames}
                    />
                </div>
                <div style={{height: 'calc(100% - 55px)', overflow: 'auto'}}>
                    {Object.keys(items).map((platform, i) => (
                        <div key={i}>
                            <div style={{
                                ...getTheme().typographyStyles.subTitleAlt,
                                backgroundColor: '#1a1a1a',
                                position: 'sticky',
                                zIndex: 1,
                                top: 0,
                                paddingBottom: 5
                            }}>
                                {this.platformNames[platform]}
                            </div>
                            <Grid
                                zoom={this.zoom}
                                platform={platform}
                            >
                                {items[platform].map((item, i) => {
                                    let imageURI = this.addNoCache((item.imageURI));
                                    return (
                                        <GridImage
                                            name={item.name}
                                            gameId={item.gameId}
                                            platform={platform}
                                            appid={item.appid}
                                            gameType={item.type}
                                            image={imageURI}
                                            zoom={this.zoom}
                                            onClick={this.onClick}
                                            key={i}
                                        />
                                    )
                                })}
                            </Grid>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}

export default Games;
