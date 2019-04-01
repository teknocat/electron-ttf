// @flow
import React, { Component } from 'react';
import ReactModal from 'react-modal';
import Mode from 'stat-mode';
import moment from 'moment';
import is from 'electron-is';
import type { ItemStateType } from '../../utils/types';

import styles from './Dialog.scss';

const posix = !is.windows() && process.env.NODE_ENV !== 'test' ? require('posix-ext') : null;

type Props = {
  activeView: string,
  mayExec: (
    targetItem: ItemStateType,
    value: ?string,
    mode: any,
    owner: ?string,
    group: ?string,
    atime: any,
    mtime: any
  ) => void,
  closeDialog: () => void
};

type State = {
  showModal: boolean,
  value: string,
  targetItem: ItemStateType,
  mode: {
    owner: {
      read: boolean,
      write: boolean,
      execute: boolean
    },
    group: {
      read: boolean,
      write: boolean,
      execute: boolean
    },
    others: {
      read: boolean,
      write: boolean,
      execute: boolean
    }
  },
  owner: ?string,
  group: ?string,
  mtimeDate: any,
  mtimeTime: any
};

export default class RenameDialog extends Component<Props, State> {
  props: Props;

  textValue: any;
  cbModeUr: any;
  cbModeUw: any;
  cbModeUx: any;
  cbModeGr: any;
  cbModeGw: any;
  cbModeGx: any;
  cbModeOr: any;
  cbModeOw: any;
  cbModeOx: any;
  textOwner: any;
  textGroup: any;
  textDate: any;
  textTime: any;
  okButton: any;
  cancelButton: any;

  state = {
    showModal: false,
    value: '',
    targetItem: {
      stats: {
        mtime: new Date(),
        atime: new Date()
      },
      fileName: '',
      fileBody: '',
      fileExt: '',
      isDirectory: false,
      isSymbolicLink: false,
      marked: false
    },
    mode: {
      owner: {
        read: false,
        write: false,
        execute: false
      },
      group: {
        read: false,
        write: false,
        execute: false
      },
      others: {
        read: false,
        write: false,
        execute: false
      }
    },
    owner: '',
    group: '',
    mtimeDate: '',
    mtimeTime: ''
  };

  closeModal() {
    this.setState({ showModal: false });
    this.props.closeDialog();
  }

  handleOK() {
    const compareModeValue = (value, value2) =>
      value.read === value2.read &&
      value.write === value2.write &&
      value.execute === value2.execute;

    const getMode = () => {
      if (
        !this.state.mode ||
        !this.state.mode.owner ||
        !this.state.mode.group ||
        !this.state.mode.others
      )
        return null;
      const origMode = new Mode(this.state.targetItem.stats);
      // console.log('origMode', origMode);
      // console.log('mode', this.state.mode);
      if (
        compareModeValue(origMode.owner, this.state.mode.owner) &&
        compareModeValue(origMode.group, this.state.mode.group) &&
        compareModeValue(origMode.others, this.state.mode.others)
      ) {
        return null;
      }
      return this.state.mode;
    };

    let dstFileName = null;
    if (this.state.value && this.state.value.length > 0) {
      if (this.state.targetItem.fileName !== this.state.value) {
        dstFileName = this.state.value;
      }
    }

    const mode = getMode.call(this);

    let owner = null;
    let group = null;
    if (
      posix &&
      this.state.owner &&
      this.state.owner.length > 0 &&
      this.state.group &&
      this.state.group.length > 0
    ) {
      ({ owner, group } = this.getOwnerGroup(this.state.targetItem));
    }

    let mtime = moment(`${this.state.mtimeDate} ${this.state.mtimeTime}`);
    if (!this.state.targetItem.stats || !this.state.targetItem.stats.mtime) {
      mtime = null;
    } else if (
      mtime.isValid() &&
      mtime.toDate().toUTCString() !==
        this.state.targetItem.stats.mtime.toUTCString()
    ) {
      mtime = mtime.toDate();
    } else {
      mtime = null;
    }

    this.props.mayExec(
      this.state.targetItem,
      dstFileName,
      mode,
      owner,
      group,
      this.state.targetItem.stats.atime,
      mtime
    );
  }

  handleCancel() {
    this.closeModal();
  }

  // $FlowFixMe
  handleChange(e) {
    // console.dir(e.target);
    if (e.target.id === 'rename_dialog_fileName') {
      this.setState({ value: e.target.value });
    } else if (e.target.id === 'rename_dialog_owner') {
      this.setState({ owner: e.target.value });
    } else if (e.target.id === 'rename_dialog_group') {
      this.setState({ group: e.target.value });
    } else if (e.target.id === 'rename_dialog_timestamp_date') {
      this.setState({ mtimeDate: e.target.value });
    } else if (e.target.id === 'rename_dialog_timestamp_time') {
      this.setState({ mtimeTime: e.target.value });
    } else {
      const { mode } = this.state;
      switch (e.target.id) {
        case 'rename_dialog_ur':
          mode.owner.read = e.target.checked;
          break;
        case 'rename_dialog_uw':
          mode.owner.write = e.target.checked;
          break;
        case 'rename_dialog_ux':
          mode.owner.execute = e.target.checked;
          break;
        case 'rename_dialog_gr':
          mode.group.read = e.target.checked;
          break;
        case 'rename_dialog_gw':
          mode.group.write = e.target.checked;
          break;
        case 'rename_dialog_gx':
          mode.group.execute = e.target.checked;
          break;
        case 'rename_dialog_or':
          mode.others.read = e.target.checked;
          break;
        case 'rename_dialog_ow':
          mode.others.write = e.target.checked;
          break;
        case 'rename_dialog_ox':
          mode.others.execute = e.target.checked;
          break;
        default:
      }
      this.setState({ mode });
    }
  }

  // $FlowFixMe
  onKeyDown(e) {
    // console.log('keyCode', e.keyCode);
    // console.dir(e.target);
    // console.log("target:", e.target.textContent);

    // Up
    if (e.keyCode === 38) {
      if (/^rename_dialog_[ugo][rwx]$/.test(e.target.id)) {
        this.textValue.focus();
      }
      if (/^rename_dialog_owner$/.test(e.target.id)) {
        this.cbModeUr.focus();
      }
      if (/^rename_dialog_group$/.test(e.target.id)) {
        this.textOwner.focus();
      }
      if (/^rename_dialog_timestamp_date$/.test(e.target.id)) {
        e.preventDefault();
        if (posix) {
          this.textGroup.focus();
        } else {
          this.cbModeUr.focus();
        }
      }
      if (/^rename_dialog_timestamp_time$/.test(e.target.id)) {
        e.preventDefault();
        this.textDate.focus();
      }
      if (/^rename_dialog_ok$/.test(e.target.id)) {
        this.textTime.focus();
      }
      if (/^rename_dialog_cancel$/.test(e.target.id)) {
        this.okButton.focus();
      }
    }
    // Down
    if (e.keyCode === 40) {
      if (e.target.id === 'rename_dialog_fileName') {
        this.cbModeUr.focus();
      }
      if (/^rename_dialog_[ugo][rwx]$/.test(e.target.id)) {
        if (posix) {
          this.textOwner.focus();
        } else {
          this.textDate.focus();
        }
      }
      if (/^rename_dialog_owner$/.test(e.target.id)) {
        this.textGroup.focus();
      }
      if (/^rename_dialog_group$/.test(e.target.id)) {
        this.textDate.focus();
      }
      if (/^rename_dialog_timestamp_date$/.test(e.target.id)) {
        e.preventDefault();
        this.textTime.focus();
      }
      if (/^rename_dialog_timestamp_time$/.test(e.target.id)) {
        e.preventDefault();
        this.okButton.focus();
      }
      if (/^rename_dialog_ok$/.test(e.target.id)) {
        this.cancelButton.focus();
      }
    }
    // Left
    if (e.keyCode === 37) {
      // if (e.target.id  === 'rename_dialog_ur') {
      //   this.cbModeOx.focus();
      // }
      if (e.target.id === 'rename_dialog_uw') {
        this.cbModeUr.focus();
      }
      if (e.target.id === 'rename_dialog_ux') {
        this.cbModeUw.focus();
      }
      if (e.target.id === 'rename_dialog_gr') {
        this.cbModeUx.focus();
      }
      if (e.target.id === 'rename_dialog_gw') {
        this.cbModeGr.focus();
      }
      if (e.target.id === 'rename_dialog_gx') {
        this.cbModeGw.focus();
      }
      if (e.target.id === 'rename_dialog_or') {
        this.cbModeGx.focus();
      }
      if (e.target.id === 'rename_dialog_ow') {
        this.cbModeOr.focus();
      }
      if (e.target.id === 'rename_dialog_ox') {
        this.cbModeOw.focus();
      }
    }
    // Right
    if (e.keyCode === 39) {
      if (e.target.id === 'rename_dialog_ur') {
        this.cbModeUw.focus();
      }
      if (e.target.id === 'rename_dialog_uw') {
        this.cbModeUx.focus();
      }
      if (e.target.id === 'rename_dialog_ux') {
        this.cbModeGr.focus();
      }
      if (e.target.id === 'rename_dialog_gr') {
        this.cbModeGw.focus();
      }
      if (e.target.id === 'rename_dialog_gw') {
        this.cbModeGx.focus();
      }
      if (e.target.id === 'rename_dialog_gx') {
        this.cbModeOr.focus();
      }
      if (e.target.id === 'rename_dialog_or') {
        this.cbModeOw.focus();
      }
      if (e.target.id === 'rename_dialog_ow') {
        this.cbModeOx.focus();
      }
      // if (e.target.id  === 'rename_dialog_ox') {
      //   this.cbModeUr.focus();
      // }
    }

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

  open(targetItem: ItemStateType) {
    // objectコピーが必要
    const mode = new Mode(Object.assign({}, targetItem.stats));
    this.setState({
      showModal: true,
      value: targetItem.fileName,
      targetItem,
      mode: {
        owner: mode.owner,
        group: mode.group,
        others: mode.others
      },
      owner: this.getOwner(targetItem),
      group: this.getGroup(targetItem),
      mtimeDate: this.getHtmlDate(targetItem.stats.mtime),
      mtimeTime: this.getHtmlTime(targetItem.stats.mtime)
    });
    this.textValue.focus();
  }

  getOwner = (targetItem: ItemStateType) =>
    posix ? posix.getpwnam(targetItem.stats.uid).name : null;
  getGroup = (targetItem: ItemStateType) =>
    posix ? posix.getgrnam(targetItem.stats.gid).name : null;

  // owner,groupどちらか変更あれば両方のstateを返す
  // TODO windows
  getOwnerGroup = (targetItem: ItemStateType) => {
    const owner = this.getOwner(targetItem);
    const group = this.getGroup(targetItem);
    if (owner === this.state.owner && group === this.state.group) {
      return { owner: null, group: null };
    }
    return { owner, group };
  };

  getHtmlDate = (date: Date) => moment(date).format('YYYY-MM-DD');

  getHtmlTime = (date: Date) => moment(date).format('HH:mm:ss');

  render() {
    const { activeView } = this.props;

    if (!this.state.showModal) return null;

    return (
      // $FlowFixMe
      <ReactModal
        isOpen={this.state.showModal}
        contentLabel="Rename Dialog"
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
          <h3>ファイル情報変更</h3>
          <input
            type="text"
            id="rename_dialog_fileName"
            className={styles.textInput}
            value={this.state.value}
            onChange={this.handleChange.bind(this)}
            ref={ref => {
              this.textValue = ref;
            }}
          />
          <div className={styles.detailsContainer}>
            <label htmlFor="rename_dialog_ur">
              <input
                type="checkbox"
                id="rename_dialog_ur"
                checked={this.state.mode.owner.read}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeUr = ref;
                }}
              />
              r
            </label>
            <label htmlFor="rename_dialog_uw">
              <input
                type="checkbox"
                id="rename_dialog_uw"
                checked={this.state.mode.owner.write}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeUw = ref;
                }}
              />
              w
            </label>
            <label htmlFor="rename_dialog_ux">
              <input
                type="checkbox"
                id="rename_dialog_ux"
                checked={this.state.mode.owner.execute}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeUx = ref;
                }}
              />
              x
            </label>
            <label htmlFor="rename_dialog_gr">
              <input
                type="checkbox"
                id="rename_dialog_gr"
                checked={this.state.mode.group.read}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeGr = ref;
                }}
              />
              r
            </label>
            <label htmlFor="rename_dialog_gw">
              <input
                type="checkbox"
                id="rename_dialog_gw"
                checked={this.state.mode.group.write}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeGw = ref;
                }}
              />
              w
            </label>
            <label htmlFor="rename_dialog_gx">
              <input
                type="checkbox"
                id="rename_dialog_gx"
                checked={this.state.mode.group.execute}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeGx = ref;
                }}
              />
              x
            </label>
            <label htmlFor="rename_dialog_or">
              <input
                type="checkbox"
                id="rename_dialog_or"
                checked={this.state.mode.others.read}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeOr = ref;
                }}
              />
              r
            </label>
            <label htmlFor="rename_dialog_ow">
              <input
                type="checkbox"
                id="rename_dialog_ow"
                checked={this.state.mode.others.write}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeOw = ref;
                }}
              />
              w
            </label>
            <label htmlFor="rename_dialog_ox">
              <input
                type="checkbox"
                id="rename_dialog_ox"
                checked={this.state.mode.others.execute}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.cbModeOx = ref;
                }}
              />
              x
            </label>
          </div>
          {posix && (
            <div className={styles.ownerGroupContainer}>
              <span>Owner:</span>
              <input
                type="text"
                id="rename_dialog_owner"
                className={styles.textInput}
                value={this.state.owner}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.textOwner = ref;
                }}
              />
              <span>&nbsp;</span>
              <span>Group:</span>
              <input
                type="text"
                id="rename_dialog_group"
                className={styles.textInput}
                value={this.state.group}
                onChange={this.handleChange.bind(this)}
                ref={ref => {
                  this.textGroup = ref;
                }}
              />
            </div>
          )}
          <div className={styles.detailsContainer}>
            <span>Timestamp:</span>
            <input
              type="date"
              id="rename_dialog_timestamp_date"
              className={styles.textInput}
              value={this.state.mtimeDate}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textDate = ref;
              }}
            />
            <input
              type="time"
              id="rename_dialog_timestamp_time"
              className={styles.textInput}
              value={this.state.mtimeTime}
              onChange={this.handleChange.bind(this)}
              ref={ref => {
                this.textTime = ref;
              }}
            />
          </div>
          <div className={styles.buttonsContainer}>
            <div className={styles.item}>
              <button
                id="rename_dialog_ok"
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
                id="rename_dialog_cancel"
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
