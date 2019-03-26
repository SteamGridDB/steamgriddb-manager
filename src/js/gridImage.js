import React from 'react';
import {Redirect} from "react-router-dom";
import ProgressBar from "react-uwp/ProgressBar";
const { Menu, MenuItem } = window.require('electron');

class GridImage extends React.Component {
    constructor(props) {
        super(props)

        this.gridWidth = 300 * this.props.zoom;
        this.gridHeight = 140 * this.props.zoom;

        this.state = {
            isHover: false,
            toSearch: false,
            downloadProgress: false
        }
    }

    onMouseEnter() {
        this.setState({isHover: true});
    }

    onMouseLeave() {
        this.setState({isHover: false});
    }

    render() {
        let overlayOpacity = this.state.isHover | 0;

        if (this.state.toSearch) {
            let to = `/search/?game=${this.props.name}&appid=${this.props.appid}&type=${this.props.gameType}`;

            return(
                <Redirect to={to} />
            )
        }

        let progressBar = "";
        if (this.state.downloadProgress) {
            progressBar = (
                <div style={{
                    position: 'absolute',
                    width: this.gridWidth + 'px',
                    bottom: '-5px'
                }}>
                    <ProgressBar
                        defaultProgressValue={this.state.downloadProgress}
                        barWidth={this.gridWidth}
                    />
                </div>
            );
        }

        let image = '';
        if (this.props.image) {
            image = (
                <img
                    src={this.props.image}
                    style={{
                        width: this.gridWidth + 'px',
                        height: this.gridHeight + 'px'
                    }}
                />
            )
        }

        return (
            <div style={{
                margin: '5px',
                position: 'relative',
                width: this.gridWidth + 'px',
                height: this.gridHeight + 'px',
                backgroundColor: '#303030'
            }}
                 onMouseEnter={this.onMouseEnter.bind(this)}
                 onMouseLeave={this.onMouseLeave.bind(this)}
                 onClick={this.props.onClick.bind(this)}
            >
                {image}

                <div style={{
                    position: 'absolute',
                    bottom: '5px',
                    width: '100%',
                    fontSize: '1.2em',
                    fontWeight: '500',
                    textAlign: 'center',
                    color: '#fff',
                    zIndex: 2
                }}>
                    {this.props.name}
                </div>

                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: this.gridWidth + 'px',
                    height: this.gridHeight + 'px',
                    background: 'rgba(0,0,0,0.5)',
                    opacity: overlayOpacity,
                    zIndex: 1
                }} />

                {progressBar}
            </div>
        )
    }
}

export default GridImage;
