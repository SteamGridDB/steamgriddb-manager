import React from 'react';
import Image from 'react-uwp/Image';
import Button from 'react-uwp/Button';
import ProgressBar from 'react-uwp/ProgressBar';
import PropTypes from 'prop-types';

class ImportListItem extends React.Component {
    constructor(props) {
        super(props);
        this.image = this.props.image;
        this.thumb = this.props.thumb;
        this.game = this.props.game;
        this.platform = this.props.platform;
        this.handleClick = this.handleClick.bind(this);
    }

    shouldComponentUpdate(nextProps) {
        return !(this.props.progress === nextProps.progress);
    }

    handleClick() {
        this.props.onImportClick(this.game, this.image, this.platform);
    }

    render() {
        let progressBar = <div></div>;
        if (this.props.progress && this.props.progress !== 1) {
            progressBar = <ProgressBar style={{display: 'block', 'width': '100%'}} defaultProgressValue={this.game.progress} />;
        }

        return (
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', width: 'inherit'}} key={this.game.id}>
                <Image
                    style={{marginRight: 10}}
                    height='30px'
                    width='64px'
                    src={this.thumb}
                />
                {this.game.name}
                <Button style={{opacity: 0, marginLeft: 'auto'}} onClick={this.handleClick}>Import</Button>
                {progressBar}
            </div>
        );
    }
}

ImportListItem.propTypes = {
    platform: PropTypes.object.isRequired,
    game: PropTypes.object.isRequired,
    progress: PropTypes.number,
    image: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.bool
    ]),
    thumb: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.bool
    ]),
    onImportClick: PropTypes.func
};

export default ImportListItem;