import React from 'react';
import Button from 'react-uwp/Button';
import PropTypes from 'prop-types';

class ImportAllButton extends React.Component {
    constructor(props) {
        super(props);

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        this.props.onButtonClick(this.props.games, this.props.grids, this.props.platform);
    }

    render() {
        return (
            <Button style={{float: 'right'}} onClick={this.handleClick}>Import All</Button>
        );
    }
}

ImportAllButton.propTypes = {
    platform: PropTypes.object.isRequired,
    games: PropTypes.array.isRequired,
    grids: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.bool
    ]).isRequired,
    onButtonClick: PropTypes.func
};

export default ImportAllButton;