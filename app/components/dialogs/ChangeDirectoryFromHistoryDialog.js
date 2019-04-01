// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import { RadioGroup, Radio } from 'react-radio-group';

import type { HistoryStateType } from '../../utils/types';
import styles from './Dialog.scss';

type Props = {
  histories: Array<HistoryStateType>,
  currentPath: string,
  activeView: string,
  closeDialog: (boolean, ?HistoryStateType) => void
};

type State = {
  showModal: boolean,
  selectedValue: ?number
};

// 選択可能な履歴数
const MAX_ENTRIES = 10;

export default class ChangeDirectoryFromHistoryDialog extends Component<
  Props,
  State
> {
  props: Props;

  state = {
    showModal: false,
    selectedValue: null
  };

  handleCloseModal(submit: boolean) {
    this.setState({ showModal: false });
    const { histories, currentPath } = this.props;
    const filteredHistories = histories.filter(
      history => history.path !== currentPath
    );
    const selected: ?HistoryStateType =
      this.state.selectedValue != null && filteredHistories != null
        ? filteredHistories[this.state.selectedValue]
        : null;
    // console.log('value', this.state.selectedValue);
    // console.log('selected', selected);
    this.props.closeDialog(submit, selected);
  }

  handleChange(value: number) {
    // console.log("handleChange", value);
    this.setState({ selectedValue: value });
  }

  handleCancel() {
    this.handleCloseModal(false);
  }

  onKeyDown(e: SyntheticKeyboardEvent<*>) {
    // console.log(`onKeyDown KeyCode:${e.keyCode}`)
    // console.log("selectedValue", this.state.selectedValue);
    if (e.keyCode === 13) this.handleCloseModal(true); // Enter
    if (e.keyCode === 27) this.handleCloseModal(false); // ESC
  }

  open() {
    // console.log('open dialog');
    this.setState({
      showModal: true,
      selectedValue: 0
    });
  }

  renderItem = (history: HistoryStateType, index: number) => (
    <label htmlFor={index}>
      <Radio value={index} autoFocus={index === 0} />
      {history.path}
    </label>
  );

  renderList = (histories: Array<HistoryStateType>) =>
    // $FlowFixMe
    histories
      .slice(0, MAX_ENTRIES)
      .map((history: HistoryStateType, index: number) => (
        <div key={index.toString()}>
          {this.renderItem(history, index)}
          <br />
        </div>
      ));

  render() {
    const { activeView, histories, currentPath } = this.props;

    if (!this.state.showModal) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Changing Order Type Dialog"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={
          activeView === 'left'
            ? styles.dialogContentLeft
            : styles.dialogContentRight
        }
        overlayClassName={styles.dialogOverlay}
      >
        <h3>履歴からのディレクトリ変更</h3>
        <form id="sortTypeForm" onSubmit={this.handleCloseModal.bind(this)}>
          <RadioGroup
            name="sortType"
            selectedValue={this.state.selectedValue}
            onChange={this.handleChange.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
          >
            {this.renderList(
              histories.filter(history => history.path !== currentPath)
            )}
          </RadioGroup>
        </form>
      </ReactModal>
    );
  }
}
