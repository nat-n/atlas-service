import { createStore, applyMiddleware } from 'redux'
import { DEFAULT_STATE, combinedReducers } from './reducers'
import logger from './middleware/logger'
import atlasData from './middleware/atlasData'


export default createStore(
  combinedReducers,
  DEFAULT_STATE,
  applyMiddleware(
    logger,
    atlasData)
);
