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

    const importList = (
      this.games.map((game, i) => {
        let { progress } = game;
        if (game.progress === undefined) {
          progress = 0;
        }

        let thumb;
        if (this.grids[i]) {
          thumb = this.grids[i].thumb;
        }

        return (
          <ImportListItem
            key={this.games.id}
            progress={progress}
            platform={this.platform}
            thumb={thumb}
            game={game}
            onImportClick={this.onImportClick}
          />
        );
      })
    );

    return (
      <ListView style={listStyle} listSource={importList} />
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
};

ImportList.defaultProps = {
  onImportClick: () => {},
};
export default ImportList;
