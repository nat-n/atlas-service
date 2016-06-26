import React from 'react';
import SceneThree from './SceneThree.jsx'
import SceneCanvas from './SceneCanvas.jsx'
import SceneControls from './SceneControls.jsx'

const App = props => (
  <div>
    <SceneCanvas sceneId="scene-1"/>
    <SceneControls sceneId="scene-1"/>
  </div>
);

export default App;
