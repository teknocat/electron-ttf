// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import is from 'electron-is';
import styles from './dialogs/Dialog.scss';
import spinnerStyles from './Spinner.scss';

type Props = {
  stopSpinner: () => void
};

type State = {
  showSpinner: boolean
};

export default class Spinner extends Component<Props, State> {
  props: Props;

  state = {
    showSpinner: false
  };

  show() {
    this.setState({
      showSpinner: true
    });
  }

  hide() {
    this.setState({
      showSpinner: false
    });
  }

  handleStop() {
    this.hide();
    this.props.stopSpinner();
  }

  // $FlowFixMe
  onKeyDown(e) {
    // Enter
    if (e.keyCode === 13) {
      if (e.target.textContent === 'Cancel') {
        this.handleStop();
      }
    }
    if (e.keyCode === 27) this.handleStop(); // ESC
  }

  render() {
    if (!this.state.showSpinner) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showSpinner}
        contentLabel="Spinner"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={styles.dialogContentCenter}
        overlayClassName={styles.dialogOverlay}
      >
        <div onKeyDown={this.onKeyDown.bind(this)} role="presentation">
          <div className={spinnerStyles.spinner} />
          <div className={styles.detailsContainer}>
            処理中…
          </div>
          { !is.windows() &&
            <div className={styles.buttonsContainer}>
              <div className={styles.item}>
                {
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                }<button onClick={this.handleStop.bind(this)} autoFocus>Cancel</button>
              </div>
            </div>
          }
        </div>
      </ReactModal>
    );
  }
}
