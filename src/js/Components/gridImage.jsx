import React from 'react';
import ProgressBar from 'react-uwp/ProgressBar';
import { CSSTransitionGroup } from 'react-transition-group';
import PropTypes from 'prop-types';

const ReactLazyLoad = require('react-lazyload').default;

class GridImage extends React.Component {
  constructor(props) {
    super(props);

    const { zoom, onGridClick } = this.props;

    this.gridWidth = 300 * zoom;
    this.gridHeight = 140 * zoom;
    this.onGridClick = onGridClick;
    this.handleClick = this.handleClick.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    const { progress } = this.props;
    return !(progress === nextProps.progress);
  }

  handleClick() {
    this.onGridClick(this.props);
  }

  render() {
    const {
      progress,
      image,
      name,
      author,
    } = this.props;
    const { theme } = this.context;

    let progressBar = <div />;
    if (progress) {
      progressBar = (
        <div
          style={{
            position: 'absolute',
            width: `${this.gridWidth}px`,
            bottom: '24px',
          }}
        >
          <ProgressBar
            defaultProgressValue={progress}
            barWidth={this.gridWidth}
          />
        </div>
      );
    }

    let lazyImage = '';
    if (image) {
      lazyImage = (
        <ReactLazyLoad
          height={this.gridHeight}
          overflow
          resize
          once
        >
          <CSSTransitionGroup
            key="1"
            style={{ display: 'flex' }}
            transitionName="grid-fadein"
            transitionAppear
            transitionAppearTimeout={1000}
            transitionEnter={false}
            transitionLeave={false}
          >
            <img
              key="1"
              alt=""
              style={{
                width: `${this.gridWidth}px`,
                height: `${this.gridHeight}px`,
              }}
              src={image}
            />
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
          width: `${this.gridWidth}px`,
        }}
        onClick={this.handleClick}
      >
        {lazyImage}

        <div
          style={{
            ...theme.typographyStyles.base,
            fontWeight: 400,
            padding: 5,
            height: 30,
            width: '100%',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            zIndex: 0,
          }}
        >
          {name}
        </div>

        <div
          className="grid-overlay"
          style={{
            width: `${this.gridWidth}px`,
            height: `${this.gridHeight}px`,
          }}
        >
          {author && (
            <span>
            Grid by:
              { ' ' }
              {author}
            </span>
          )}
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
    PropTypes.number,
  ]),
  index: PropTypes.number,
  gameType: PropTypes.string,
  gameId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  platform: PropTypes.string,
  author: PropTypes.string,
  zoom: PropTypes.number,
  progress: PropTypes.number,
  image: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  onGridClick: PropTypes.func,
};
GridImage.contextTypes = { theme: PropTypes.object };

export default GridImage;
