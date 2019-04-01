// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import { RadioGroup, Radio } from 'react-radio-group';

import styles from './Dialog.scss';
import type {SortType} from "../../utils/types";

type Props = {
  initialValue: SortType,
  activeView: string,
  closeDialog: (boolean, SortType) => void
};

type State = {
  showModal: boolean,
  selectedValue: SortType
};

export default class ChangeSortTypeDialog extends Component<Props, State> {
  props: Props;

  state = {
    showModal: false,
    selectedValue: 'FileAscDirFirst'
  };

  handleCloseModal(submit: boolean) {
    this.setState({ showModal: false });
    // 親側で定義したダイアログ閉じた際の処理
    this.props.closeDialog(submit, this.state.selectedValue);
  }

  handleChange(value: SortType) {
    // console.log("handleChange", value);
    this.setState({ selectedValue: value });
  }

  onKeyDown(e: SyntheticKeyboardEvent<*>) {
    // console.log(`onKeyDown KeyCode:${e.keyCode}`)
    // console.log("selectedValue", this.state.selectedValue);
    if (e.keyCode === 13) this.handleCloseModal(true); // Enter
    if (e.keyCode === 27) this.handleCloseModal(false); // ESC
  }

  open() {
    // console.log('open dialog');
    this.setState({ showModal: true });
    if (this.props.initialValue) {
      this.setState({
        selectedValue: this.props.initialValue
      });
    }
  }

  render() {
    const { activeView, initialValue } = this.props;

    if (!this.state.showModal) return null;

    // TODO ディレクトリを上、昇順・降順はソート対象と直交させる
    // TODO 一覧をデータから自動生成したい
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
        <h3>ソート順変更</h3>
        <form
          id="sortTypeForm"
          onSubmit={this.handleCloseModal.bind(this)}
          className={styles.form}
        >
          <RadioGroup
            name="sortType"
            selectedValue={this.state.selectedValue}
            onChange={this.handleChange.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
          >
            <label htmlFor="FileAscDirFirst">
              <Radio
                value="FileAscDirFirst"
                autoFocus={initialValue === 'FileAscDirFirst'}
              />
              ファイル名昇順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="FileDescDirFirst">
              <Radio
                value="FileDescDirFirst"
                autoFocus={initialValue === 'FileDescDirFirst'}
              />
              ファイル名降順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="ExtAscDirFirst">
              <Radio
                value="ExtAscDirFirst"
                autoFocus={initialValue === 'ExtAscDirFirst'}
              />
              拡張子昇順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="ExtDescDirFirst">
              <Radio
                value="ExtDescDirFirst"
                autoFocus={initialValue === 'ExtDescDirFirst'}
              />
              拡張子降順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="DateAscDirFirst">
              <Radio
                value="DateAscDirFirst"
                autoFocus={initialValue === 'DateAscDirFirst'}
              />
              更新日時昇順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="DateDescDirFirst">
              <Radio
                value="DateDescDirFirst"
                autoFocus={initialValue === 'DateDescDirFirst'}
              />
              更新日時降順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="SizeAscDirFirst">
              <Radio
                value="SizeAscDirFirst"
                autoFocus={initialValue === 'SizeAscDirFirst'}
              />
              ファイルサイズ昇順／ディレクトリが上
            </label>
            <br />
            <label htmlFor="SizeDescDirFirst">
              <Radio
                value="SizeDescDirFirst"
                autoFocus={initialValue === 'SizeDescDirFirst'}
              />
              ファイルサイズ降順／ディレクトリが上
            </label>
            <br />
          </RadioGroup>
        </form>
      </ReactModal>
    );
  }
}
