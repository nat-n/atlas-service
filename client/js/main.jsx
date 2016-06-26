import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './components/App.jsx';
import store from './store';
import { fetchShapesets } from './actions/atlas-data';

require("../styles/main.scss")

init();

function init() {
  store.dispatch(fetchShapesets());

  SceneJS.setConfigs({ pluginPath: '/plugins' });

  ReactDOM.render(
    <Provider store={store}>
      <App/>
    </Provider>,
    document.getElementById('content')
  );
}
