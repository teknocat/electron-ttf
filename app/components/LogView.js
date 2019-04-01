// @flow
import React, { Component } from 'react';
import styles from './LogView.scss';

type Props = {};

type State = {
  messages: Array<string>
};

export default class LogView extends Component<Props, State> {
  props: Props;

  messagesEnd: any;

  state = {
    messages: []
  };

  // reactjs - How to scroll to bottom in react? - Stack Overflow
  // https://stackoverflow.com/questions/37620694/how-to-scroll-to-bottom-in-react
  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: 'instant' });
  };

  addMessage(message: string) {
    this.state.messages.push(message);
    this.forceUpdate();
  }

  // 最終行の末尾に文字列を追加
  updateMessage(message: string) {
    const last = this.state.messages.pop();
    this.state.messages.push(`${last}${message}`);
    this.forceUpdate();
  }

  getMessages(): Array<any> {
    const { messages } = this.state;
    // console.log('messages:', messages);
    return messages.map((message, index) => (
      <li key={index.toString()}>{message}</li>
    ));
  }

  render() {
    return (
      <div className={styles.logview}>
        <ul id="options-holder">
          {this.getMessages()}
          <li
            ref={el => {
              this.messagesEnd = el;
            }}
          />
        </ul>
      </div>
    );
  }
}
