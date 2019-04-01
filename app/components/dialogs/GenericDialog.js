// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';

import styles from './Dialog.scss';

type Props = {
  action: string,
  activeView: string,
  closeDialog: (submit: boolean, withShiftKey: boolean) => void
};

type State = {
  showModal: boolean,
  withShiftKey: boolean
};

export default class GenericDialog extends Component<Props, State> {
  props: Props;

  okButton: any;
  cancelButton: any;

  state = {
    showModal: false,
    withShiftKey: false
  };

  closeModal(submit: boolean) {
    this.setState({ showModal: false });
    // 親側で定義したダイアログ閉じた際の処理
    // console.log('with shift key:', this.state.withShiftKey);
    this.props.closeDialog(submit, this.state.withShiftKey);
  }

  handleOK() {
    this.closeModal(true);
  }

  handleCancel() {
    this.closeModal(false);
  }

  // $FlowFixMe
  onKeyDown(e) {
    // console.log(`onKeyDown KeyCode:${e.keyCode}`)

    if (e.keyCode === 16) this.setState({ withShiftKey: true }); // SHIFT

    // if (e.keyCode === 13) this.handleCloseModal(true); // Enter
    if (e.keyCode === 27) this.closeModal(false); // ESC
    if (e.keyCode === 37) this.okButton.focus(); // LEFT
    if (e.keyCode === 39) this.cancelButton.focus(); // RIGHT
  }

  // $FlowFixMe
  onKeyUp(e) {
    // console.log(`onKeyUp KeyCode:${e.keyCode}`)
    if (e.keyCode === 16) this.setState({ withShiftKey: false }); // SHIFT
  }

  open() {
    console.log('open dialog');
    this.setState({
      showModal: true,
      withShiftKey: false
    });
  }

  render() {
    const { activeView, action } = this.props;

    if (!this.state.showModal) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Dialog"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={
          activeView === 'left'
            ? styles.dialogContentLeft
            : styles.dialogContentRight
        }
        overlayClassName={styles.dialogOverlay}
      >
        <div
          onKeyDown={this.onKeyDown.bind(this)}
          onKeyUp={this.onKeyUp.bind(this)}
          role="presentation"
        >
          <h3>確認</h3>
          <div>{action}してもよろしいですか？</div>
          <div className={styles.buttonsContainer}>
            <div className={styles.item}>
              {
                // eslint-disable-next-line jsx-a11y/no-autofocus
              }<button ref={ref => {this.okButton = ref;}} onClick={this.handleOK.bind(this)} autoFocus>OK</button>
            </div>
            <div className={styles.item}>
              {
                // eslint-disable-next-line jsx-a11y/no-autofocus
              }<button ref={ref => {this.cancelButton = ref;}} onClick={this.handleCancel.bind(this)}>Cancel</button>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }
}
