// @flow
import React, { Component } from 'react';
import fs from 'fs';
import styles from './ImageView.scss';
import type {ContentStateType} from "../utils/types";
import {convertPath} from '../utils/file';

const Mousetrap = require('mousetrap-pause')(require('mousetrap'));

type Props = {
  content: ContentStateType,
  exitView: () => void
};

type State = {
};

export default class ImageView extends Component<Props, State> {
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
  }

  getPageHeight = () => {
    const style = window.getComputedStyle(this.container);
    return this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  };

  handleCancel() {
    this.props.exitView();
  }

  getImage = (path: string, ext: string) => {
    let image = null;
    let mimeType = null;
    try {
      image = fs.readFileSync(path).toString('base64');
      if (/^png$/i.test(ext)) {
        mimeType = "image/png";
      } else if (/^jpe?g$/i.test(ext)) {
        mimeType = "image/jpeg";
      }
    } catch (e) {
      console.error(e);
    }

    return {image, mimeType};
  };

  renderView(path: string, ext: string) {
    const {image, mimeType} = this.getImage(path, ext);
    if (!image || !mimeType) return;
    const src = `data:${mimeType};base64,${image}`;
    return (
      <img src={src} alt={path} className={styles.inner} />
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

    const imageFilePath = convertPath(targetItem.fileName, path);
    // console.log('content', this.props.content);
    // console.log('path', path);
    if (!imageFilePath) {
      this.props.exitView();
      return;
    }

    return (
      <div
        className={styles.imageView}
        onKeyDown={this.onKeyDown.bind(this)}
        role="presentation"
        tabIndex="-1"
        ref={ref => {
          this.container = ref;
        }}
      >
        {this.renderView(imageFilePath, targetItem.fileExt)}
      </div>
    );
  }
}
