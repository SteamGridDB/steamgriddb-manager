import React from 'react';
import PubSub from 'pubsub-js';
import Toast from 'react-uwp/Toast';
import Icon from 'react-uwp/Icon';

class ToastHandler extends React.Component {
  constructor(props) {
    super(props);
    this.close = this.close;
    this.state = {
      toasts: [],
    };
  }

  componentDidMount() {
    PubSub.subscribe('toast', (message, args) => {
      const { toasts } = this.state;
      const toast = { toast: args, show: true };
      this.close(toast, 3000);
      this.setState({
        toasts: toasts.concat(toast),
      });
    });
  }

  close(toast, closeDelay) {
    const self = this;
    setTimeout(() => {
      const toasts = self.state.toasts.slice(0);
      toasts[toasts.indexOf(toast)].show = false;
      self.setState({ toasts });
    }, closeDelay);
  }

  render() {
    const { toasts } = this.state;
    return (
      <>
        {toasts.slice(0).map((x, i) => (
          <Toast
            key={i}
            defaultShow={x.show}
            logoNode={<Icon>{x.toast.logoNode}</Icon>}
            title={x.toast.title}
            showCloseIcon
          >
            {x.toast.contents}
          </Toast>
        ))}
      </>
    );
  }
}

export default ToastHandler;
