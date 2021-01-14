import React from 'react';
import ListView from 'react-uwp/ListView';
import PropTypes from 'prop-types';
import ImportListItem from './ImportListItem';

class ImportList extends React.Component {
  constructor(props) {
    super(props);

    const {
      onImportClick,
      games,
      grids,
      platform,
    } = this.props;

    this.onImportClick = onImportClick;
    this.games = games;
    this.grids = grids;
    this.platform = platform;
  }

  render() {
    const listStyle = {
      background: 'none',
      border: 0,
      width: '100%',
      marginBottom: 10,
      clear: 'both',
    };

    const { steamIsRunning } = this.props;

    const importList = this.games.map((game, i) => {
      let { progress } = game;
      let thumb;

      if (game.progress === undefined) {
        progress = 0;
      }

      if (this.grids[i]) {
        thumb = this.grids[i].thumb;
      }

      return {
        itemNode: (
          <ImportListItem
            key={game.id}
            progress={progress}
            platform={this.platform}
            thumb={thumb}
            game={game}
            onImportClick={this.onImportClick}
            steamIsRunning={steamIsRunning}
          />
        ),
      };
    });

    return (
      <>
        <ListView style={listStyle} listSource={importList} />
      </>
    );
  }
}

ImportList.propTypes = {
  games: PropTypes.array.isRequired,
  grids: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.bool,
  ]).isRequired,
  platform: PropTypes.object.isRequired,
  onImportClick: PropTypes.func,
  steamIsRunning: PropTypes.bool,
};

ImportList.defaultProps = {
  onImportClick: () => {},
  steamIsRunning: false,
};
export default ImportList;
