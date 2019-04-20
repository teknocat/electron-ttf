// @flow
import React, { Component } from 'react';
import fs from 'fs';
import Encoding from 'encoding-japanese';
import styles from './TextView.scss';
import type {ContentStateType} from "../utils/types";
import {convertPath} from '../utils/file';

const Mousetrap = require('mousetrap-pause')(require('mousetrap'));

type Props = {
  content: ContentStateType,
  exitView: () => void
};

type State = {
};

export default class TextView extends Component<Props, State> {
  props: Props;

  container: any;

  state = {
  };

  componentDidMount() {
    this.container.focus();
  }

  // $FlowFixMe
  onKeyDown(e) {
    // console.log('keyCode=', e.keyCode);
    if (e.keyCode === 13) this.handleCancel(); // Enter
    if (e.keyCode === 27) this.handleCancel(); // ESC
    if (e.keyCode === 39) this.container.scrollTop += this.getPageHeight(); // RIGHT
    if (e.keyCode === 37) this.container.scrollTop -= this.getPageHeight(); // LEFT
  }

  getPageHeight = () => {
    const style = window.getComputedStyle(this.container);
    return this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  };

  handleCancel() {
    this.props.exitView();
  }

  // TODO streamを使って非同期読み込み
  getText = (path: string) => {
    let data = '';
    try {
      const buffer = fs.readFileSync(path);
      const detected = Encoding.detect(buffer);
      console.log('detected', detected);
      if (['UTF8', 'SJIS', 'EUCJP', 'JIS', 'ASCII'].indexOf(detected) >= 0) {
        data = Encoding.convert(buffer, {from: detected, to: 'UNICODE', type: 'string'});
      } else if (['BINARY', 'UTF32'].indexOf(detected) >= 0) {
        // テキスト表示出来ないもの
        data = path;
      } else {
        data = buffer;
      }
    } catch (e) {
      console.error(e);
    }

    return data;
  };

  renderView(path: string) {
    const text = this.getText(path);
    return (
      <pre className={styles.inner}>
        {text}
      </pre>
    );
  }

  render() {
    Mousetrap.pause();
    const {targetItem, activeView} = this.props.content;
    const {path} = this.props.content[activeView];

    if (!targetItem) {
      this.props.exitView();
      return;
    }

    const textFilePath = convertPath(targetItem.fileName, path);
    // console.log('content', this.props.content);
    // console.log('path', path);
    if (!textFilePath) {
      this.props.exitView();
      return;
    }

    return (
      <div
        className={styles.textView}
        onKeyDown={this.onKeyDown.bind(this)}
        role="presentation"
        tabIndex="-1"
        ref={ref => {
          this.container = ref;
        }}
      >
        {this.renderView(textFilePath)}
      </div>
    );
  }
}
