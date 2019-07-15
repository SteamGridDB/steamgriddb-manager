import React from 'react';
import ProgressRing from 'react-uwp/ProgressRing';

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
                width: '100%',
                height: '100%'
            }}>
                <ProgressRing size={100} />
            </div>
        )
    }
}

export default Spinner;
