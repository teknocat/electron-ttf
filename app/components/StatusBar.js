// @flow
import React, { Component } from 'react';
import styles from './StatusBar.scss';
import type {ContentStateType, ItemStateType} from "../utils/types";
import {
  getFileModeString,
  getFileDateString,
  getFileSizeString,
  getFileOwnerString
} from '../utils/file';

type Props = {
  content: ContentStateType
};

export default class StatusBar extends Component<Props> {
  props: Props;

  render() {
    const { content } = this.props;
    const activeContent = content[content.activeView];
    const currentItem: ?ItemStateType = activeContent.items[activeContent.position];
    if (currentItem == null) return null;

    return (
      <div className={styles.statusBar}>
        <span>
          ▶ &nbsp;
          {getFileModeString(currentItem)}
          &nbsp;
          {getFileOwnerString(currentItem)}
          &nbsp;
          {getFileSizeString(currentItem)}
          &nbsp;
          {getFileDateString(currentItem)}
          &nbsp;
          {currentItem.fileName}
        </span>
      </div>
    );
  }
}
