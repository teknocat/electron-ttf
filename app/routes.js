/* eslint flowtype-errors/show-errors: 0 */
import React from 'react';
import { Switch, Route } from 'react-router';
import App from './containers/App';
import Home from './containers/Home/index';

export default () => (
  <App>
    <Switch>
      <Route path="/" component={Home} />
    </Switch>
  </App>
);
