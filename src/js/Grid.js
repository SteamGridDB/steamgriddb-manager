import React from "react";
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Icon from 'react-uwp/Icon';
import Button from 'react-uwp/Button';

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
                gridTemplateColumns: 'repeat(auto-fit, minmax(' + (300 * this.zoom + 20) + 'px, 1fr))',
                gridAutoRows: (160 * this.zoom + 10) + 'px',
                justifyItems: 'center',
                ...this.props.style
            }}>
                {this.props.children}
            </div>
        )
    }
}

export default Grid;