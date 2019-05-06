import React, {Component} from "react";
// import passwdUser from 'passwd-user';
// import posix from 'posix-ext';
// import classNames from 'classnames/bind';
import {
  getFileModeString,
  getFileDateString,
  getFileSizeString,
  getFileOwnerString
} from '../utils/file';
import {ItemStateType} from '../utils/types'
import styles from './Item.scss';

type Props = {
  viewPosition: string,
  index: number,
  file: ItemStateType,
  curidx: number,
  infoType: number
};

export default class Item extends Component<Props> {
  props: Props;

  getFileBody() {
    const {isDirectory, fileBody, fileExt} = this.props.file;
    if (isDirectory) {
      const ext = this.fileExtString(fileExt);
      return ext ? `${fileBody}.${ext}` : fileBody;
    }
    return fileBody;
  }

  getFileExt() {
    const {isDirectory, fileExt} = this.props.file;
    if (isDirectory) {
      return ''
    }
    const ext = this.fileExtString(fileExt);
    return ext ? `.${ext}` : '';
  }

  fileExtString = (fileExt) => fileExt ? `${fileExt}` : '';

  getFileMode() {
    return getFileModeString(this.props.file);
  }

  getFileDate() {
    return getFileDateString(this.props.file);
  }

  getFileSize() {
    return getFileSizeString(this.props.file);
  }

  getFileOwner() {
    return getFileOwnerString(this.props.file);
  }

  getClassName() {
    const {index, curidx, file} = this.props;
    const {marked} = file;
    return (`
      ${index === curidx ? 'focused' : ''}
      ${marked ? styles.marked : ''}
      ${styles.items}
    `)
  }

  render() {
    const {
      viewPosition,
      index,
      infoType
    } = this.props;

    if (infoType === 1) {
      // ファイル名・拡張子・ファイルモード・作成日時
      return (
        <li
          id={`item_${viewPosition}_${index}`}
          key={index.toString()}
          className={this.getClassName()}
        >
          <span className={styles.type1FileBody}>
            {this.getFileBody()}
          </span>
          {this.getFileExt() &&
            <span className={styles.type1FileExt}>
              {this.getFileExt()}
            </span>
          }
          <span className={styles.type1FileMode}>
            {this.getFileMode()}
          </span>
          <span className={styles.type1FileDate}>
            {this.getFileDate()}
          </span>
        </li>
      );
    }

    else if (infoType === 2) {
      // ファイル名・拡張子・ファイルサイズ・作成日時
      // TODO サイズはB->K-M切り替えられるように
      return (
        <li
          id={`item_${viewPosition}_${index}`}
          key={index.toString()}
          className={this.getClassName()}
        >
          <span className={styles.type2FileBody}>
            {this.getFileBody()}
          </span>
          {this.getFileExt() &&
            <span className={styles.type2FileExt}>
              {this.getFileExt()}
            </span>
          }
          <span className={styles.type2FileSize}>
            {this.getFileSize()}
          </span>
          <span className={styles.type2FileDate}>
            {this.getFileDate()}
          </span>
        </li>
      );
    }

    else if (infoType === 3) {
      // ファイル名・拡張子・所有者・グループ・作成日時
      return (
        <li
          id={`item_${viewPosition}_${index}`}
          key={index.toString()}
          className={this.getClassName()}
        >
          <span className={styles.type3FileBody}>
            {this.getFileBody()}
          </span>
          {this.getFileExt() &&
            <span className={styles.type3FileExt}>
              {this.getFileExt()}
            </span>
          }
          <span className={styles.type3FileOwner}>
            {this.getFileOwner()}
          </span>
          <span className={styles.type3FileDate}>
            {this.getFileDate()}
          </span>
        </li>
      );
    }
  }
}
