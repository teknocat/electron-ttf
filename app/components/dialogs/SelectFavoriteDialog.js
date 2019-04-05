// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import { RadioGroup, Radio } from 'react-radio-group';

import styles from './Dialog.scss';

type Props = {
  favorites: ?Array<string>,
  activeView: string,
  closeDialog: (boolean, string) => void,
  message: string
};

type State = {
  showModal: boolean,
  selectedValue: ?number
};

export default class SelectFavoriteDialog extends Component<
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
    const selected = this.state.selectedValue != null && this.props.favorites
      ? this.props.favorites[this.state.selectedValue] : '';
    this.props.closeDialog(submit, selected);
  }

  handleChange(value: number) {
    this.setState({ selectedValue: value });
  }

  handleCancel() {
    this.handleCloseModal(false);
  }

  onKeyDown(e: SyntheticKeyboardEvent<*>) {
    if (e.keyCode === 13) { // Enter
      e.preventDefault();
      this.handleCloseModal(true);
    }
    if (e.keyCode === 27) this.handleCloseModal(false); // ESC
  }

  open() {
    this.setState({
      showModal: true,
      selectedValue: 0
    });
  }

  renderItem = (favorite: string, index: number) => (
    <label htmlFor={index}>
      <Radio value={index} autoFocus={index === 0} />
      {favorite}
    </label>
  );

  renderList = (favorites: Array<string>) =>
    // $FlowFixMe
    favorites
      .map((favorite: string, index: number) => (
        <div key={index.toString()}>
          {this.renderItem(favorite, index)}
          <br />
        </div>
      ));

  render() {
    const { activeView, favorites, message } = this.props;

    if (!this.state.showModal) return null;
    if (!favorites) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Select Favorite Dialog"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={
          activeView === 'left'
            ? styles.dialogContentLeft
            : styles.dialogContentRight
        }
        overlayClassName={styles.dialogOverlay}
      >
        <h3>{ message }</h3>
        <form id="favoritesForm" onSubmit={this.handleCloseModal.bind(this)}>
          <RadioGroup
            name="favorite"
            selectedValue={this.state.selectedValue}
            onChange={this.handleChange.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
          >
            {this.renderList(favorites)}
          </RadioGroup>
        </form>
      </ReactModal>
    );
  }
}
