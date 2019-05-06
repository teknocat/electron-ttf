// @flow
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import classNames from 'classnames/bind';
import type { ContentStateType } from '../utils/types';
import { fetchItems } from '../actions/content';
import styles from './Content.scss';
import Item from './Item';
import { getMaskInfo, getPathInfo } from '../utils/util';

type Props = {
  viewPosition: string,
  fetchItems: (string, keepPosition?: boolean, keepMarks?: boolean) => void,
  content: ContentStateType,
  exitFindMode: () => void,
  findItem: (string, boolean) => void,
  changeActiveView: (targetView: string) => void
};

type State = {
  markInfo: string,
  directoryInfo: {
    isFindMode: boolean,
    findText: string,
    content: string
  }
};

const WAIT_INTERVAL = 200;

class Content extends Component<Props, State> {
  props: Props;

  findModeText: any;
  timer: any;

  state = {
    markInfo: '',
    directoryInfo: {
      isFindMode: false,
      findText: '',
      content: ''
    }
  };

  componentDidMount() {
    // console.log("viewPosition: ", this.props.viewPosition)
    this.props.fetchItems(this.props.viewPosition, true, true);
  }

  componentDidUpdate() {
    if (this.findModeText) {
      this.findModeText.focus();
    }
  }

  renderList(viewPosition, curidx, infoType) {
    return this.props.content[viewPosition].items.map((file, index) => (
      <Item
        key={index.toString()}
        viewPosition={viewPosition}
        index={index}
        file={file}
        curidx={curidx}
        infoType={infoType}
      />
    ));
  }

  renderDirectoryInfo() {
    const { directoryInfo } = this.state;
    // ファイルインクリメンタルサーチの場合の表示変更
    if (directoryInfo.isFindMode) {
      return (
        <div
          className={styles.findInfo}
          onKeyDown={this.onKeyDown.bind(this)}
          role="presentation"
        >
          <span className={styles.findLabel}>Find file:&nbsp;</span>
          <input
            type="text"
            onChange={this.handleChange.bind(this)}
            onBlur={this.handleBlur.bind(this)}
            ref={ref => {
              this.findModeText = ref;
            }}
          />
        </div>
      );
    }
    return (
      <div className={styles.directoryInfo}>
        <span>{directoryInfo.content}</span>
      </div>
    );
  }

  renderPathInfo = (viewPosition, content) => (
    <span>
      {getPathInfo(content[viewPosition], getMaskInfo(viewPosition, content))}
    </span>
  );

  onKeyDown(e) {
    // console.log('keyCode', e.keyCode);
    // TABのフォーカス移動を無効化する
    if (e.keyCode === 9) e.preventDefault(); // TAB
    if (e.keyCode === 13) this.handleOK(); // Enter
    if (e.keyCode === 27) this.handleCancel(); // ESC
  }

  handleOK() {
    const { findText } = this.state.directoryInfo;
    if (!findText || findText.length === 0) {
      this.exitFindMode();
    } else {
      this.props.findItem(findText, true);
    }
  }

  handleCancel() {
    this.exitFindMode();
  }

  handleChange(event) {
    const { directoryInfo } = this.state;
    const findText = event.target.value;
    directoryInfo.findText = findText;
    this.setState({ directoryInfo });

    clearTimeout(this.timer);

    if (!findText || findText.length === 0) return;

    this.timer = setTimeout(this.triggerChange.bind(this), WAIT_INTERVAL);
  }

  handleBlur() {
    this.exitFindMode();
  }

  triggerChange() {
    const { directoryInfo } = this.state;

    this.props.findItem(directoryInfo.findText, false);
  }

  exitFindMode() {
    const { directoryInfo } = this.state;
    directoryInfo.isFindMode = false;
    directoryInfo.findText = '';
    this.setState({ directoryInfo });
    this.props.exitFindMode();
  }

  updateMarkInfo(message) {
    // console.log('updateMarkInfo: ', message);
    this.setState({
      markInfo: message
    });
    this.forceUpdate();
  }

  updateDirectoryInfo(message) {
    // console.log('updateDirectoryInfo: ', message);
    const { directoryInfo } = this.state;
    directoryInfo.content = message;
    this.setState({ directoryInfo });
    this.forceUpdate();
  }

  launchFindMode() {
    const { directoryInfo } = this.state;
    directoryInfo.isFindMode = true;
    this.setState({ directoryInfo });
  }

  handleClick = (e, targetView) => {
    this.props.changeActiveView(targetView);
  };

  render() {
    const { viewPosition, content } = this.props;

    const cx = classNames.bind(styles);

    const curidx = content[viewPosition].position;
    // console.log('curidx=', curidx);

    const { infoType } = content[viewPosition];

    // スクロール位置をカーソル要素に合わせる
    if (content.activeView === viewPosition) {
      // console.log('activeView=', viewPosition);
      const element = document.getElementById(`item_${viewPosition}_${curidx}`);
      if (element) {
        // console.dir(element);
        // $FlowFixMe
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      // console.log('activeElement:');
      // console.dir(document.activeElement)
    }

    return (
      <div
        id={`content_${viewPosition}`}
        className={cx({
          content: true,
          contentLeft: viewPosition === 'left',
          contentRight: viewPosition === 'right',
          active: content.activeView === viewPosition
        })}
        role="presentation"
        onClick={e => this.handleClick(e, viewPosition)}
      >
        <div className={styles.topInfoContainer}>
          <div className={styles.pathInfo}>
            {this.renderPathInfo(viewPosition, content)}
          </div>
          <div className={styles.markInfo}>
            <span>{this.state.markInfo}</span>
          </div>
        </div>
        <div id={`contentBody_${viewPosition}`} className={styles.contentBody}>
          <ul>{this.renderList(viewPosition, curidx, infoType)}</ul>
        </div>
        <div className={styles.bottomInfoContainer}>
          {this.renderDirectoryInfo()}
        </div>
      </div>
    );
  }
}

function mapStateToProps({ content }) {
  return { content };
}

function mapDispatchToProps(dispatch: Function) {
  return {
    fetchItems: bindActionCreators(fetchItems, dispatch)
  };
}

// Advanced React/Redux Techniques | How to Use Refs on Connected Components
// https://itnext.io/advanced-react-redux-techniques-how-to-use-refs-on-connected-components-e27b55c06e34
export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { withRef: true }
)(Content);
