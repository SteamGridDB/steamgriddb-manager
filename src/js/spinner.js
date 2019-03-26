import React from 'react';
import {ProgressCircle} from 'react-desktop/windows';

class Spinner extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%'
            }}>
                <ProgressCircle size="100" />
            </div>
        )
    }
}

export default Spinner;
