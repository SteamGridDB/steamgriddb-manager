import React from 'react';
import Button from 'react-uwp/Button';
import PropTypes from 'prop-types';

class ImportAllButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const {
      onButtonClick,
      games,
      platform,
    } = this.props;

    onButtonClick(games, platform);
  }

  render() {
    const { steamIsRunning } = this.props;

    return (
      <Button
        style={{ float: 'right' }}
        onClick={this.handleClick}
        disabled={steamIsRunning}
      >
        Import All
      </Button>
    );
  }
}

ImportAllButton.propTypes = {
  platform: PropTypes.object.isRequired,
  games: PropTypes.array.isRequired,
  onButtonClick: PropTypes.func,
  steamIsRunning: PropTypes.bool,
};

ImportAllButton.defaultProps = {
  onButtonClick: () => {},
  steamIsRunning: false,
};

export default ImportAllButton;
