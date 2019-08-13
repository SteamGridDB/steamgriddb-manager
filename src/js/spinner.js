import React from 'react';
import PropTypes from 'prop-types';
import {ProgressCircle} from 'react-desktop/windows';

class Spinner extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
            }}>
                <ProgressCircle size="100" color={this.context.theme.accent} />
            </div>
        );
    }
}

Spinner.contextTypes = { theme: PropTypes.object };
export default Spinner;
