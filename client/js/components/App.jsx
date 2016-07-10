import React from 'react';
import SceneThree from './SceneThree.jsx'
import SceneCanvas from './SceneCanvas.jsx'
import SceneControls from './SceneControls.jsx'

const App = props => (
  <div>
    <SceneThree sceneId="scene-1" width={600} height={600}/>
    <SceneControls sceneId="scene-1"/>
  </div>
);

export default App;
