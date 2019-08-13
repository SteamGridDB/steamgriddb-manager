import React from 'react';
import PropTypes from 'prop-types';
import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import AutoSuggestBox from 'react-uwp/AutoSuggestBox';
import Grid from './Grid';
import Steam from './Steam';

class Games extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = 1;
        this.platformNames = {
            'steam': 'Steam',
            'other': 'Other Games',
            'origin': 'Origin',
            'uplay': 'Uplay',
            'egs': 'Epic Games Launcher',
            'gog': 'GOG.com',
            'bnet': 'Blizzard Battle.net'
        };

        this.state = {
            error: null,
            isLoaded: false,
            isHover: false,
            toSearch: false,
            hasSteam: true,
            items: {}
        };
    }

    componentDidMount() {
        if (Object.entries(this.state.items).length <= 0) {
            Steam.getSteamPath().then(() => {
                this.fetchGames();
            }).catch(() => {
                this.setState({
                    hasSteam: false
                });
            });
        }
    }

    fetchGames() {
        const steamGamesPromise = Steam.getSteamGames();
        const nonSteamGamesPromise = Steam.getNonSteamGames();
        Promise.all([steamGamesPromise, nonSteamGamesPromise]).then((values) => {
            this.setState({
                isLoaded: true,
                items: {
                    steam: values[0],
                    ...values[1]
                }
            });
        });
    }

    onClick() {
        this.setState({toSearch: true});
    }

    filterGames(searchTerm) {
        console.log(searchTerm);
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
                <h5 style={{...this.context.theme.typographyStyles.title, textAlign: 'center'}}>
                    Steam installation not found.
                </h5>
            );
        }

        if (!isLoaded) {
            return <Spinner/>;
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
                                ...this.context.theme.typographyStyles.subTitleAlt,
                                backgroundColor: '#1a1a1a',
                                position: 'sticky',
                                zIndex: 2,
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
                                    const imageURI = this.addNoCache((item.imageURI));
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

Games.contextTypes = { theme: PropTypes.object };
export default Games;
