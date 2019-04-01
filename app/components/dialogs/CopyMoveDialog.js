// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import { RadioGroup, Radio } from 'react-radio-group';

import styles from './Dialog.scss';
import type { ItemStateType, CopyMoveType } from '../../utils/types';

type ActionType = 'COPY' | 'MOVE';

type Props = {
  action: ActionType,
  activeView: string,
  closeDialog: (submit: boolean, withShiftKey: boolean, selected: CopyMoveType, fileName: ?string) => void
};

type State = {
  showModal: boolean,
  withShiftKey: boolean,
  selectedValue: CopyMoveType,
  fileName: ?string
};

export default class CopyMoveDialog extends Component<Props, State> {
  props: Props;

  fileName: any;

  state = {
    showModal: false,
    withShiftKey: false,
    selectedValue: 'OverwriteIfNewer',
    fileName: null
  };

  handleCloseModal(submit: boolean) {
    this.setState({ showModal: false });
    // 親側で定義したダイアログ閉じた際の処理
    this.props.closeDialog(
      submit,
      this.state.withShiftKey,
      this.state.selectedValue,
      this.state.fileName
    );
  }

  handleChange(value: CopyMoveType) {
    // console.log("handleChange", value);
    this.setState({ selectedValue: value });
    if (value === 'ChangeFileName') {
      this.fileName.focus();
    }
  }

  // $FlowFixMe
  handleChangeFileName(e) {
    // console.log("handleChangeFileName", e.target.value);
    this.setState({ fileName: e.target.value });
  }

  // $FlowFixMe
  onKeyDown(e) {
    // console.log(`onKeyDown KeyCode:${e.keyCode}`);
    // console.log('e.target.id', e.target.id);
    // console.log("selectedValue", this.state.selectedValue);
    if (e.keyCode === 16) this.setState({ withShiftKey: true }); // SHIFT

    if (e.keyCode === 13) {
      e.preventDefault();
      this.handleCloseModal(this.state.selectedValue !== 'Cancel'); // Enter
    }
    if (e.keyCode === 27) this.handleCloseModal(false); // ESC

    if (e.target.id === 'copy_dialog_fileName') {
      if (e.keyCode === 38) {
        // Up
        this.setState({ selectedValue: 'OverwriteIfNewer' });
        const next = document.querySelector('input[value="OverwriteIfNewer"]');
        // console.log('next', next);
        if (next) next.focus();
      }
      if (e.keyCode === 40) {
        // Down
        this.setState({ selectedValue: 'Cancel' });
        const next = document.querySelector('input[value="Cancel"]');
        // console.log('next', next);
        if (next) next.focus();
      }
    }
  }

  onKeyUp(e: SyntheticKeyboardEvent<*>) {
    // console.log(`onKeyUp KeyCode:${e.keyCode}`);
    if (e.keyCode === 16) this.setState({ withShiftKey: false }); // SHIFT
  }

  open(targetItem: ItemStateType) {
    console.log('open dialog', targetItem);
    this.setState({
      showModal: true,
      withShiftKey: false,
      selectedValue: 'OverwriteIfNewer',
      fileName: targetItem.fileName
    });
  }

  render() {
    const { action, activeView } = this.props;

    if (!this.state.showModal) return null;

    const actionName = action === 'COPY' ? 'コピー' : '移動';

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Copy/Move Dialog"
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
          <h3>上書き{actionName}</h3>
          <RadioGroup
            name="copyType"
            selectedValue={this.state.selectedValue}
            onChange={this.handleChange.bind(this)}
          >
            <label htmlFor="Overwrite">
              <Radio
                value="Overwrite"
                autoFocus={this.state.selectedValue === 'Overwrite'}
              />
              強制上書き
            </label>
            <br />
            { action === 'COPY' &&
            <label htmlFor="OverwriteIfNewerSubDirectory">
              <Radio
                value="OverwriteIfNewerSubDirectory"
                autoFocus={this.state.selectedValue === 'OverwriteIfNewerSubDirectory'}
              />
              新しければ上書き(サブディレクトリ対象)
            </label>
            }
            { action === 'COPY' && <br /> }
            <label htmlFor="OverwriteIfNewer">
              <Radio
                value="OverwriteIfNewer"
                autoFocus={this.state.selectedValue === 'OverwriteIfNewer'}
              />
              新しければ上書き
            </label>
            <br />
            <label htmlFor="ChangeFileName">
              <Radio
                value="ChangeFileName"
                autoFocus={this.state.selectedValue === 'ChangeFileName'}
              />
              ファイル名変更
            </label>
            <div className={styles.radioInputContainer}>
              <input
                type="text"
                id="copy_dialog_fileName"
                className={styles.textInput}
                value={this.state.fileName}
                onChange={this.handleChangeFileName.bind(this)}
                ref={ref => {
                  this.fileName = ref;
                }}
              />
            </div>
            <br />
            <label htmlFor="Cancel">
              <Radio
                value="Cancel"
                autoFocus={this.state.selectedValue === 'Cancel'}
              />
              キャンセル
            </label>
            <br />
          </RadioGroup>
        </div>
      </ReactModal>
    );
  }
}
