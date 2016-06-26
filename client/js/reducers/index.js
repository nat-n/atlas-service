import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';
import * as scenes from './scenes.js';
import * as shapesets from './shapesets.js';

export const DEFAULT_STATE = fromJS({
  scenes: scenes.state,
  shapesets: shapesets.state
});

export const combinedReducers = combineReducers({
  scenes: scenes.reducer,
  shapesets: shapesets.reducer
});
