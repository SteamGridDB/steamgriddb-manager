import React from 'react';
import ProgressBar from 'react-uwp/ProgressBar';
import {CSSTransitionGroup} from 'react-transition-group';
import PropTypes from 'prop-types';
const ReactLazyLoad = require('react-lazyload').default;

class GridImage extends React.Component {
    constructor(props) {
        super(props);

        this.gridWidth = 300 * this.props.zoom;
        this.gridHeight = 140 * this.props.zoom;
        this.onGridClick = this.props.onGridClick;
        this.handleClick = this.handleClick.bind(this);
    }

    shouldComponentUpdate(nextProps) {
        return !(this.props.progress === nextProps.progress);
    }

    handleClick() {
        this.onGridClick(this.props);
    }

    render() {
        let progressBar = <div></div>;
        if (this.props.progress) {
            progressBar = (
                <div style={{
                    position: 'absolute',
                    width: `${this.gridWidth}px`,
                    bottom: '-5px'
                }}>
                    <ProgressBar
                        defaultProgressValue={this.props.progress}
                        barWidth={this.gridWidth}
                    />
                </div>
            );
        }


        let image = '';
        if (this.props.image) {
            image = (
                <ReactLazyLoad
                    height={this.gridHeight}
                    overflow
                    resize
                    once
                >
                    <CSSTransitionGroup key="1"
                        transitionName="grid-fadein"
                        transitionAppear={true}
                        transitionAppearTimeout={1000}
                        transitionEnter={false}
                        transitionLeave={false}>
                        <img key="1" style={{
                            width: `${this.gridWidth}px`,
                            height: `${this.gridHeight}px`
                        }} src={this.props.image} />
                    </CSSTransitionGroup>
                </ReactLazyLoad>
            );
        }

        return (
            <div
                style={{
                    margin: '5px',
                    position: 'relative',
                    width: `${this.gridWidth}px`,
                    height: `${this.gridHeight}px`,
                    backgroundColor: '#303030'
                }}
                onClick={this.handleClick}
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
                    zIndex: 0
                }}>
                    {this.props.name}
                </div>

                <div
                    className="grid-overlay"
                    style={{
                        width: `${this.gridWidth}px`,
                        height: `${this.gridHeight}px`
                    }}
                >
                    {this.props.author &&
                        <span>Grid by: {this.props.author}</span>
                    }
                </div>

                {progressBar}
            </div>
        );
    }
}

GridImage.propTypes = {
    name: PropTypes.string,
    appid: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),
    index: PropTypes.number,
    gameType: PropTypes.string,
    gameId: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]),
    platform: PropTypes.string,
    author: PropTypes.string,
    zoom: PropTypes.number,
    progress: PropTypes.number,
    image: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.bool
    ]),
    onGridClick: PropTypes.func
};

export default GridImage;
