import React from "react";
import {Collapse} from 'react-collapse';
import {Theme as UWPThemeProvider, getTheme} from "react-uwp/Theme";
import Icon from 'react-uwp/Icon';
import Button from 'react-uwp/Button';

class Grid extends React.Component {
    constructor(props) {
        super(props);

        this.zoom = this.props.zoom;
        this.platform = this.props.platform;
        this.state = {
            open: true
        }
    }

    toggle() {
        this.setState({
            open: this.state.open ? false : true
        });
    }

    render() {
        let iconRotated = {};

        if (this.state.open) {
            iconRotated = {
                transform: 'rotate(180deg)'
            }
        }

        return (
            <div style={{
                width: '100%'
            }}>
                <Button style={{fontSize: 24, width: 'calc(100% - 10px)',}} onClick={this.toggle.bind(this)}>
                    <div style={{...getTheme().typographyStyles.base, float: 'left'}}>
                        {this.platform}
                    </div>
                    <Icon style={{...iconRotated, float: 'right', fontSize: 16, lineHeight: '20px'}}>ChevronDown</Icon>
                </Button>

                <Collapse isOpened={this.state.open}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(' + (300 * this.zoom + 20) + 'px, 1fr))',
                        gridAutoRows: (160 * this.zoom + 10) + 'px',
                        justifyItems: 'center',
                        maxHeight: 'calc(100vh - 50px)',
                        overflowX: 'hidden',
                        overflowY: 'auto'
                    }}>
                        {this.props.children}
                    </div>
                </Collapse>
            </div>
        )
    }
}

export default Grid;