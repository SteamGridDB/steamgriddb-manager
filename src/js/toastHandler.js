import React from "react";
import PubSub from "pubsub-js";
import Toast from "react-uwp/Toast";
import Icon from "react-uwp/Icon";

class ToastHandler extends React.Component {
    constructor(props) {
        super(props);

        this.state = {toast: null};

        PubSub.subscribe('toast', (message, args) => {
            this.setState({toast: args});
        });
    }

    render() {
        if (this.state.toast) {
            console.log('state toast:', this.state.toast);
        }

        let toast = this.state.toast ? (
            <Toast
                defaultShow={true}
                logoNode={<Icon>{this.state.toast.logoNode}</Icon>}
                title={this.state.toast.title}
                closeDelay={3000}
                showCloseIcon
            >
                {this.state.toast.contents}
            </Toast>
        ) : (<div/>);

        return toast;
    }
}

export default ToastHandler;