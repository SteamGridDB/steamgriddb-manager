import React from 'react';
import PropTypes from 'prop-types';
import {Redirect} from 'react-router-dom';
import Spinner from './spinner.js';
import GridImage from './gridImage.js';
import AutoSuggestBox from 'react-uwp/AutoSuggestBox';
import CommandBar from 'react-uwp/CommandBar';
import AppBarButton from 'react-uwp/AppBarButton';
import AppBarSeparator from 'react-uwp/AppBarSeparator';
import Grid from './Grid';
import Steam from './Steam';
import queryString from 'query-string';
import UWPNoise from '../img/uwp-noise.png';

class Games extends React.Component {
    constructor(props) {
        super(props);
        this.toSearch = this.toSearch.bind(this);

        const qs = this.props.location && queryString.parse(this.props.location.search);
        this.scrollToTarget = qs.scrollto;

        this.zoom = 1;
        this.platformNames = {
            'steam': 'Steam',
            'origin': 'Origin',
            'uplay': 'Uplay',
            'egs': 'Epic Games Launcher',
            'gog': 'GOG.com',
            'bnet': 'Blizzard Battle.net',
            'other': 'Other Games'
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

    componentDidUpdate(prevProps, prevState) {
        if (Object.entries(prevState.items).length === 0 && this.scrollToTarget) {
            this.scrollTo(this.scrollToTarget);
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

    toSearch(props) {
        const parsedQs = queryString.stringify({
            game: props.name,
            appid: props.appid,
            type: props.gameType,
            gameId: props.gameId,
            platform: props.platform
        });

        const to = `/search/?${parsedQs}`;
        this.setState({
            toSearch: <Redirect to={to} />
        });
    }

    filterGames() {
        //console.log(searchTerm);
    }

    scrollTo(id) {
        document.getElementById(id).scrollIntoView(true);
        document.querySelector('#grids-container').scrollTop -= 64; // scroll down a bit cause grid goes under floating launcher name
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

        if (this.state.toSearch) {
            return this.state.toSearch;
        }

        // Sort games alphabetically
        for (const platform in items) {
            items[platform] = items[platform].sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
        }

        return (
            <div style={{height: 'inherit', overflow: 'hidden'}}>
                <div id="grids-container" style={{height: '100%', overflow: 'auto', marginTop: 5}}>
                    <CommandBar
                        style={{
                            position: 'fixed',
                            top: 30,
                            width: '100%',
                            zIndex: 2,
                            backgroundColor: 'rgba(0,0,0,.2)',
                            backgroundImage: `url(${UWPNoise})`,
                            backdropFilter: 'blur(20px)'
                        }}
                        contentStyle={{
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: 'auto'
                        }}
                        contentNode={
                            <AutoSuggestBox
                                placeholder='Search'
                                onChangeValue={this.filterGames}
                            />
                        }
                        background="transparent"
                        labelPosition="collapsed"
                        primaryCommands={[
                            <AppBarSeparator key={1} />,
                            <AppBarButton key={2} icon="Sort" label="Sort" />,
                            <AppBarButton key={3} icon="Refresh" label="Refresh" />
                        ]}
                    />
                    <div style={{ height: 48 }}></div> {/* Spacer for CommandBar */}
                    {Object.keys(items).map((platform, i) => (
                        <div key={i} style={{paddingLeft: 10}}>
                            <div style={{
                                ...this.context.theme.typographyStyles.subTitleAlt,
                                display: 'inline-block',
                                position: 'sticky',
                                zIndex: 3,
                                marginLeft: 10,
                                top: 8
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
                                        // id attribute is used as a scroll target after a search
                                        <div id={item.appid} key={i}>
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
