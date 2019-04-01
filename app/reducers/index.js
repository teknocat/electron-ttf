// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import content from './content';

const rootReducer = combineReducers({
  content,
  router
});

export default rootReducer;
