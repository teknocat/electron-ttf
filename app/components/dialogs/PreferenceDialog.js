// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import type {PreferenceType} from "../../utils/types";

import styles from './Dialog.scss';

type Props = {
  closeDialog: (boolean, PreferenceType) => void
};

type State = {
  showModal: boolean,
  preferences: PreferenceType,
  watchExcludesString: ?string,
  favoritePathListString: ?string
};

export default class PreferenceDialog extends Component<Props, State> {
  props: Props;

  textTerminalEmulator: any;
  cbKbd101: any;
  textWatchExcludes: any;
  cbShowPathOnTitleBar: any;
  textAreaFavoritePathList: any;
  textTextFileRegexp: any;
  okButton: any;
  cancelButton: any;

  state = {
    showModal: false,
    preferences: {
      terminalEmulator: null,
      kbd101: true,
      watchExcludes: [],
      showPathOnTitleBar: false,
      favoritePathList: [],
      textFileRegexp: null,
    },
    watchExcludesString: null,
    favoritePathListString: null
  };

  closeModal(submit: boolean) {
    this.setState({ showModal: false });
    this.props.closeDialog(submit, { ...this.state.preferences });
  }

  handleOK() {
    if (this.isValid()) {
      const { preferences } = this.state;
      preferences.watchExcludes =
        this.state.watchExcludesString ?
          this.state.watchExcludesString.split(',').map(s => s.trim()) :
          [];
      preferences.favoritePathList =
        this.state.favoritePathListString ?
          this.state.favoritePathListString.split('\n').map(s => s.trim()) :
          [];
      this.setState({ preferences });
      this.closeModal(true);
    }
  }

  handleCancel() {
    this.closeModal(false);
  }

  // $FlowFixMe
  handleChange(e) {
    // console.dir(e.target);
    const { preferences } = this.state;
    switch (e.target.id) {
      case 'preference_dialog_terminal_emulator':
        preferences.terminalEmulator = e.target.value;
        break;
      case 'preference_dialog_kbd101':
        preferences.kbd101 = e.target.checked;
        break;
      case 'preference_dialog_watchExcludes':
        this.setState({ watchExcludesString: e.target.value});
        break;
      case 'preference_dialog_showPathOnTitleBar':
        preferences.showPathOnTitleBar = e.target.checked;
        break;
      case 'preference_dialog_favoritePathList':
        this.setState({ favoritePathListString: e.target.value});
        break;
      case 'preference_dialog_text_file_regexp':
        preferences.textFileRegexp = e.target.value;
        break;
      default:
        return;
    }
    this.setState({ preferences });
  }

  // $FlowFixMe
  onKeyDown(e) {
    // Up
    if (e.keyCode === 38) {
      switch (e.target.id) {
        case 'preference_dialog_terminal_emulator':
          this.cancelButton.focus();
          break;
        case 'preference_dialog_kbd101':
          this.textTerminalEmulator.focus();
          break;
        case 'preference_dialog_watchExcludes':
          this.cbKbd101.focus();
          break;
        case 'preference_dialog_showPathOnTitleBar':
          this.textWatchExcludes.focus();
          break;

        case 'preference_dialog_text_file_regexp':
          this.textAreaFavoritePathList.focus();
          break;
        case 'preference_dialog_ok':
          this.textTextFileRegexp.focus();
          break;
        case 'preference_dialog_cancel':
          this.okButton.focus();
          break;
        default:
          break;
      }
    }
    // Down
    if (e.keyCode === 40) {
      switch (e.target.id) {
        case 'preference_dialog_terminal_emulator':
          this.cbKbd101.focus();
          break;
        case 'preference_dialog_kbd101':
          this.textWatchExcludes.focus();
          break;
        case 'preference_dialog_watchExcludes':
          this.cbShowPathOnTitleBar.focus();
          break;
        case 'preference_dialog_showPathOnTitleBar':
          this.textAreaFavoritePathList.focus();
          break;

        case 'preference_dialog_text_file_regexp':
          this.okButton.focus();
          break;
        case 'preference_dialog_ok':
          this.cancelButton.focus();
          break;
        case 'preference_dialog_cancel':
          this.textTerminalEmulator.focus();
          break;
        default:
          break;
      }
    }

    // Enter
    if (e.keyCode === 13) {
      if (e.target.id === 'preference_dialog_favoritePathList') return;
      if (e.target.id === 'preference_dialog_cancel') {
        this.handleCancel();
      } else {
        this.handleOK();
      }
    }
    if (e.keyCode === 27) this.handleCancel(); // ESC
  }

  isValid() {
    if (!this.state.preferences) return false;
    if (this.isNullOrEmpty(this.state.preferences.terminalEmulator)) return false;

    return true;
  }

  isNullOrEmpty = (string: ?string) => !(string && string.length > 0);

  open(prefs: PreferenceType) {
    this.setState({
      showModal: true,
      preferences: { ...prefs },
      watchExcludesString: prefs.watchExcludes ? prefs.watchExcludes.join(',') : '',
      favoritePathListString: prefs.favoritePathList ? prefs.favoritePathList.join('\n') : '',
    });
    this.textTerminalEmulator.focus();
  }

  render() {
    if (!this.state.showModal) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Preference Dialog"
        ariaHideApp={false}
        parentSelector={() => document.querySelector('#mainPanel')}
        className={styles.dialogContentWhole}
        overlayClassName={styles.dialogOverlay}
      >
        <div onKeyDown={this.onKeyDown.bind(this)} role="presentation">
          <h3>設定変更</h3>
          <div className={styles.detailsContainer}>
            <span className={styles.label}>端末エミュレータ:</span>
            <input
              type="text"
              id="preference_dialog_terminal_emulator"
              className={styles.textInput}
              value={this.state.preferences.terminalEmulator}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textTerminalEmulator = ref;
              }}
            />
          </div>
          <div className={styles.detailsContainer}>
            <label htmlFor="preference_dialog_kbd101">
              <input
                type="checkbox"
                id="preference_dialog_kbd101"
                checked={this.state.preferences.kbd101}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbKbd101 = ref;
                }}
              />
              101 キーモード (反映には再起動が必要)
            </label>
          </div>
          <div className={styles.detailsContainer}>
            <span className={styles.label}>監視除外ディレクトリ(複数指定する場合はカンマ区切り):</span>
            <input
              type="text"
              id="preference_dialog_watchExcludes"
              className={styles.textInput}
              value={this.state.watchExcludesString}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textWatchExcludes = ref;
              }}
            />
          </div>
          <div className={styles.detailsContainer}>
            <label htmlFor="preference_dialog_showPathOnTitleBar">
              <input
                type="checkbox"
                id="preference_dialog_showPathOnTitleBar"
                checked={this.state.preferences.showPathOnTitleBar}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbShowPathOnTitleBar = ref;
                }}
              />
              タイトルバーに現在のディレクトリパス情報を表示
            </label>
          </div>
          <div className={styles.detailsContainer}>
            <span className={styles.label}>登録パス(改行区切り):</span>
            <textarea
              id="preference_dialog_favoritePathList"
              className={styles.textArea}
              value={this.state.favoritePathListString}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textAreaFavoritePathList = ref;
              }}
              rows="4"
              wrap="off"
            />
          </div>
          <div className={styles.detailsContainer}>
            <span className={styles.label}>テキストファイルパターン(正規表現):</span>
            <input
              type="text"
              id="preference_dialog_text_file_regexp"
              className={styles.textInput}
              value={this.state.preferences.textFileRegexp}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textTextFileRegexp = ref;
              }}
            />
          </div>

          <div className={styles.buttonsContainer}>
            <div className={styles.item}>
              <button
                id="preference_dialog_ok"
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
                id="preference_dialog_cancel"
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
