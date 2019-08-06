import React from 'react';
import ListView from 'react-uwp/ListView';
import PropTypes from 'prop-types';
import ImportListItem from './ImportListItem';

class ImportList extends React.Component {
    constructor(props) {
        super(props);

        this.games = this.props.games;
        this.grids = this.props.grids;
        this.platform = this.props.platform;
        this.onImportClick = this.props.onImportClick;
    }

    render() {
        const listStyle = {
            background: 'none',
            border: 0,
            width: '100%',
            marginBottom: 10,
            clear: 'both'
        };

        const importList = (
            this.games.map((game, i) => {
                let thumb = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII=';
                let image = null;
                if (this.games.length > 1 && this.grids[i].length === 1 && this.grids[i][0].success !== false) {
                    thumb = this.grids[i][0].thumb;
                    image = this.grids[i][0].url;
                } else if (this.games.length === 1 && this.grids) {
                    thumb = this.grids[0].thumb;
                    image = this.grids[0].url;
                }

                let progress = game.progress;
                if (typeof game.progress == 'undefined') {
                    progress = 0;
                }

                return (
                    <ImportListItem
                        key={this.games.id}
                        progress={progress}
                        image={image}
                        thumb={thumb}
                        game={game}
                        platform={this.platform}
                        onImportClick={this.onImportClick}
                    />
                );
            })
        );

        return (
            <ListView style={listStyle} listSource={importList}/>
        );
    }
}

ImportList.propTypes = {
    games: PropTypes.array.isRequired,
    grids: PropTypes.array.isRequired,
    platform: PropTypes.object.isRequired,
    onImportClick: PropTypes.func
};

export default ImportList;
