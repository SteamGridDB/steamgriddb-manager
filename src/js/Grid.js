import React from 'react';
import PropTypes from 'prop-types';

class Grid extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = this.props.zoom;
        this.platform = this.props.platform;
    }

    render() {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(${(300 * this.zoom + 20)}px, 1fr))`,
                justifyItems: 'center',
                ...this.props.style
            }}>
                {this.props.children}
            </div>
        );
    }
}

Grid.propTypes = {
    children: PropTypes.node.isRequired,
    platform: PropTypes.string,
    zoom: PropTypes.number,
    style: PropTypes.object
};

export default Grid;