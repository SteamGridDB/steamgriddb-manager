import React from 'react';
import PropTypes from 'prop-types';
import { ProgressCircle } from 'react-desktop/windows';

const Spinner = (props, context) => {
  const { theme } = context;
  const { text } = props;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <ProgressCircle size="100" color={theme.accent} />
      <p style={{ marginTop: 15 }}>{text}</p>
    </div>
  );
};

Spinner.propTypes = {
  text: PropTypes.string,
};

Spinner.defaultProps = {
  text: '',
};

Spinner.contextTypes = { theme: PropTypes.object };
export default Spinner;
