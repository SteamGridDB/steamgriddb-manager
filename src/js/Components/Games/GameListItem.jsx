import React from 'react';
import PropTypes from 'prop-types';
import ListView from 'react-uwp/ListView';

class GameListItem extends React.Component {
  constructor(props) {
    super(props);

    const { platform } = this.props;

    this.platform = platform;
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(index) {
    const { onItemClick } = this.props;
    onItemClick(this.platform, index);
  }

  render() {
    const { platform, platformName, listSource } = this.props;
    const { theme } = this.context;

    return (
      <div key={platform} style={{ paddingLeft: 10 }}>
        <div style={{
          ...theme.typographyStyles.subTitleAlt,
          display: 'inline-block',
          position: 'sticky',
          zIndex: 3,
          marginLeft: 10,
          top: -22,
        }}
        >
          {platformName}
        </div>
        <ListView
          style={{ border: 0, width: '100%' }}
          background="transparent"
          onChooseItem={this.handleClick}
          listSource={listSource}
        />
      </div>
    );
  }
}

GameListItem.propTypes = {
  platform: PropTypes.string.isRequired,
  listSource: PropTypes.arrayOf(PropTypes.node).isRequired,
  platformName: PropTypes.string.isRequired,
  onItemClick: PropTypes.func,
};

GameListItem.defaultProps = {
  onItemClick: () => {},
};

GameListItem.contextTypes = { theme: PropTypes.object };

export default GameListItem;
