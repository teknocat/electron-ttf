// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';

import styles from './Dialog.scss';

type Props = {
  activeView: string,
  closeDialog: (boolean, string) => void
};

type State = {
  showModal: boolean,
  value: string
};

export default class FileMaskDialog extends Component<Props, State> {
  props: Props;

  textInput: any;
  okButton: any;
  cancelButton: any;

  state = {
    showModal: false,
    value: ''
  };

  closeModal(submit: boolean) {
    this.setState({ showModal: false });
    this.props.closeDialog(submit, this.state.value);
  }

  handleOK() {
    if (this.state.value && this.state.value.length > 0) {
      this.closeModal(true);
    }
  }

  handleCancel() {
    this.closeModal(false);
  }

  // $FlowFixMe
  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  // $FlowFixMe
  onKeyDown(e) {
    // console.dir(e.target);
    // console.log("target:", e.target.textContent);
    // Enter
    if (e.keyCode === 13) {
      if (e.target.textContent !== 'Cancel') {
        this.handleOK();
      } else {
        this.handleCancel();
      }
    }
    if (e.keyCode === 27) this.handleCancel(); // ESC
  }

  open(maskPattern: string) {
    this.setState({
      showModal: true,
      value: maskPattern
    });
    this.textInput.focus();
    this.textInput.setSelectionRange(0, 0);
  }

  render() {
    const { activeView } = this.props;

    if (!this.state.showModal) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Executing Command Dialog"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={
          activeView === 'left'
            ? styles.dialogContentLeft
            : styles.dialogContentRight
        }
        overlayClassName={styles.dialogOverlay}
      >
        <div onKeyDown={this.onKeyDown.bind(this)} role="presentation">
          <h3>ファイルマスク設定</h3>
          <input
            type="text"
            className={styles.textInput}
            value={this.state.value}
            onChange={this.handleChange.bind(this)}
            ref={ref => {
              this.textInput = ref;
            }}
          />
          <div className={styles.buttonsContainer}>
            <div className={styles.item}>
              <button
                ref={ref => {
                  this.okButton = ref;
                }}
                onClick={this.handleOK.bind(this)}
              >
                OK
              </button>
            </div>
            <div className={styles.item}>
              <button
                ref={ref => {
                  this.cancelButton = ref;
                }}
                onClick={this.handleCancel.bind(this)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }
}
