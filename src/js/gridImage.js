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
                    bottom: '24px'
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
                        style={{display: 'flex'}}
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
                className="grid-wrapper"
                style={{
                    margin: 5,
                    position: 'relative',
                    width: `${this.gridWidth}px`
                }}
                onClick={this.handleClick}
            >
                {image}

                <div style={{
                    ...this.context.theme.typographyStyles.base,
                    fontWeight: 400,
                    padding: 5,
                    height: 30,
                    width: '100%',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
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
GridImage.contextTypes = { theme: PropTypes.object };

export default GridImage;
