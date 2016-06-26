import React from 'react';
import { connect } from 'react-redux'
import { RegisterScene } from '../actions/scene'
import { Map as ImMap } from 'immutable';

const mapStateToProps = (state, ownProps) => {
  return {
    get sceneState() { return state.get('scenes').get(ownProps.sceneId) },
    get regions() {
      try {
        let activeShapeset = state.get('scenes').get(ownProps.sceneId).get('activeShapeset');
        let activeVersion = state.get('scenes').get(ownProps.sceneId).get('activeVersion');
        let activeBuild = state.get('scenes').get(ownProps.sceneId).get('activeBuild');
        return state.get('scenes')
          .get(ownProps.sceneId)
          .get('regions')
          .get(activeShapeset)
          .get(`${activeVersion}+${activeBuild}`) || ImMap();
      } catch (e) {
        return ImMap();
      }
    }
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    registerScene: (id) => dispatch(RegisterScene(id))
  }
}


class SceneCanvas extends React.Component {
  constructor(props) {
    super(props);
    this.registerScene = props.registerScene;
    this.regionNodes = new Map();;
  }

  componentDidMount() {
    this.scene = SceneJS.createScene({
      canvasId: this.props.sceneId,
      nodes:[]
    });

    this.registerScene(this.props.sceneId);

    this.scene.addNode({
      type: "cameras/orbit",
      eye:{ x:0, y:0 },
      look:{ y:0 },
      yaw: 0,
      pitch: -20,
      zoom: 50,
      minZoom: 30,
      maxZoom: 300,
      zoomSensitivity: 5.0,
      nodes:[
        {
          id: 'baseNode',
          type: 'material',
          color: { r: Math.random(), g: Math.random(), b: Math.random() },
          nodes: [
            { type: 'geometry/torus' }
          ]
        }
      ]
    });
  }

  componentWillReceiveProps(nextProps) {
    var nextSceneState = nextProps.sceneState;
    var thisSceneState = this.props.sceneState;
    if (thisSceneState && nextSceneState.get('teapot') !== thisSceneState.get('teapot')) {
      this.updateTeatime(nextSceneState);
    }

    // TODO: check for changes to regions,
    // - remove no longer present regions from scene
    // - initialise new regions in scene
    if (this.props.regions !== nextProps.regions) {
      let removedRegions = [];
      let addedRegions = [];
      nextProps.regions.forEach((region, regionName) => {
        if (!this.props.regions.has(regionName)) {
          addedRegions.push(region);
        }
      });
      this.props.regions.forEach((region, regionName) => {
        if (!nextProps.regions.has(regionName)) {
          removedRegions.push(region);
        } else if (nextProps.regions.get(regionName) !== region) {
          removedRegions.push(region);
          addedRegions.push(nextProps.regions.get(regionName));
        }
      });


      removedRegions.forEach((region) => {
        this.removeRegion(region);
      });

      addedRegions.forEach((region) => {
        this.addRegion(region);
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return false;
  }

  removeRegion(region) {
    var existingNode = this.scene.getNode(`region-${region.name}`);
    if (existingNode) {
      existingNode.destroy();
    }
  }

  addRegion(region) {
    region.asMesh.then((mesh) => {
      console.log('mesh', mesh);
      this.scene.getNode('baseNode', (n) => n.addNode({
        type: "geometry",
        id: `region-${region.name}`,
        primitive: "triangles",
        positions: mesh.vertex_positions,
        normals: "auto",
        // normals: mesh.vertex_normals,
        indices: mesh.faces
      }));
    });
  }

  updateTeatime(state) {
    if (!state.has('teapot')) {
      return;
    }
    if (state.get('teapot')) {
      this.scene.getNode('baseNode', (n) => n.addNode({
        id: 'teapot',
        type: 'geometry/teapot'
      }));
    } else {
      this.scene.getNode('teapot').destroy();
    }
  }

  render() {
    return (
      <div className="scene-canvas">
        <canvas id={this.props.sceneId} width="750" height="700"/>
      </div>
    );
  }
}


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SceneCanvas)
