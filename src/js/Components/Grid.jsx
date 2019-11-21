import React from 'react';
import PropTypes from 'prop-types';

class Grid extends React.Component {
  constructor(props) {
    super(props);

    const { zoom, platform } = this.props;

    this.zoom = zoom;
    this.platform = platform;
  }

  render() {
    const { children, style } = this.props;
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${(300 * this.zoom + 20)}px, 1fr))`,
          justifyItems: 'center',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }
}

Grid.propTypes = {
  children: PropTypes.node.isRequired,
  platform: PropTypes.string,
  zoom: PropTypes.number,
  style: PropTypes.object,
};

export default Grid;
