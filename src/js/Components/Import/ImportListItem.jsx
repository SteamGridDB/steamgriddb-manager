import React from 'react';
import Image from 'react-uwp/Image';
import Button from 'react-uwp/Button';
import ProgressBar from 'react-uwp/ProgressBar';
import PropTypes from 'prop-types';

class ImportListItem extends React.Component {
  constructor(props) {
    super(props);

    const {
      game,
      platform,
    } = this.props;

    this.game = game;
    this.platform = platform;
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { onImportClick } = this.props;
    onImportClick(this.game, this.platform);
  }

  render() {
    const { progress, thumb, steamIsRunning } = this.props;

    let progressBar = <></>;
    if (progress && progress !== 1) {
      progressBar = <ProgressBar style={{ display: 'block', width: '100%' }} defaultProgressValue={this.game.progress} />;
    }

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          width: 'inherit',
        }}
      >
        <Image
          style={{ marginRight: 10 }}
          height="30px"
          width="64px"
          src={thumb}
        />
        {this.game.name}
        <Button
          style={{ opacity: 0, marginLeft: 'auto' }}
          onClick={this.handleClick}
          disabled={steamIsRunning}
        >
          Import
        </Button>
        {progressBar}
      </div>
    );
  }
}

ImportListItem.propTypes = {
  platform: PropTypes.object.isRequired,
  game: PropTypes.object.isRequired,
  progress: PropTypes.number,
  thumb: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  onImportClick: PropTypes.func,
  steamIsRunning: PropTypes.bool,
};

ImportListItem.defaultProps = {
  progress: 0,
  thumb: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII=',
  onImportClick: () => {},
  steamIsRunning: false,
};

export default ImportListItem;
