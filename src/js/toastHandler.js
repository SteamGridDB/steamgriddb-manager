import React from 'react';
import PubSub from 'pubsub-js';
import Toast from 'react-uwp/Toast';
import Icon from 'react-uwp/Icon';

class ToastHandler extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            toast: null,
            show: false
        };
        PubSub.subscribe('toast', (message, args) => {
            this.setState({
                toast: args,
                show: true
            });
        });
    }

    closed() {
        this.setState({
            show: false
        });
    }

    render() {
        const toast = this.state.toast ? (
            <Toast
                defaultShow={this.state.show}
                logoNode={<Icon>{this.state.toast.logoNode}</Icon>}
                title={this.state.toast.title}
                closeDelay={3000}
                onToggleShowToast={this.closed.bind(this)}
                showCloseIcon
            >
                {this.state.toast.contents}
            </Toast>
        ) : (<div/>);

        return toast;
    }
}

export default ToastHandler;