import React from 'react';
import React3 from 'react-three-renderer';
import THREE from 'three';
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { Map as ImMap } from 'immutable';

import { RegisterScene } from '../actions/scene'

import TrackballControls from '../lib/trackball';

import MouseInput from '../lib/MouseInput';

import Region from './Region.jsx';


const regionsSelector = createSelector(
  [(state, props) => {
    let activeShapeset = state.getIn(['scenes', props.sceneId, 'activeShapeset']);
    let activeVersion = state.getIn(['scenes', props.sceneId, 'activeVersion']);
    let activeBuild = state.getIn(['scenes', props.sceneId, 'activeBuild']);
    return state.getIn(['scenes', props.sceneId, 'regions', activeShapeset, `${activeVersion}+${activeBuild}`]);
  }],
  (regions) => regions ? regions.valueSeq().toArray() : []);


const mapStateToProps = (state, ownProps) => {
  return {
    sceneState: state.getIn(['scenes', ownProps.sceneId]),
    regions: regionsSelector(state, ownProps)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    registerScene: (id) => dispatch(RegisterScene(id))
  }
}


class SceneCanvas extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      cameraPosition: new THREE.Vector3(0, 0, 1000),
      cameraRotation: new THREE.Euler(),
      mouseInput: null,
      hovering: false,
      dragging: false,
    };

    this._cursor = {
      hovering: false,
      dragging: false,
    };

    this.lightPosition = new THREE.Vector3(0, 500, 2000);
    this.lightTarget = new THREE.Vector3(0, 0, 0);

    this._onTrackballChange = this._onTrackballChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.regions !== this.props.regions;
  }

  _onAnimate() {
    this._onAnimateInternal();
  }

  componentDidMount() {
    this.props.registerScene(this.props.sceneId);


    // this.stats = new Stats();

    // this.stats.domElement.style.position = 'absolute';
    // this.stats.domElement.style.top = '0px';

    const {
      container,
      camera,
    } = this.refs;

    // container.appendChild(this.stats.domElement);

    const controls = new TrackballControls(camera);

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    this.controls = controls;

    this.controls.addEventListener('change', this._onTrackballChange);
    this.mountedRegions = [];
  }

  _onRegionMounted(regions){
    this.mountedRegions = mountedRegions;
  }

  _onHoverStart() {
    this.setState({ hovering: true });
  }

  _onHoverEnd() {
    this.setState({ hovering: false });
  }

  _onDragStart() {
    this.setState({ dragging: true });
  }

  _onDragEnd() {
    this.setState({ dragging: false });
  }

  componentDidUpdate(newProps) {
    const {
      mouseInput,
    } = this.refs;

    const {
      width,
      height,
    } = this.props;

    if (width !== newProps.width || height !== newProps.height) {
      mouseInput.containerResized();
    }
  }

  _onTrackballChange() {
    this.setState({
      cameraPosition: this.refs.camera.position.clone(),
      cameraRotation: this.refs.camera.rotation.clone(),
    });
  }

  componentWillUnmount() {
    this.controls.removeEventListener('change', this._onTrackballChange);

    this.controls.dispose();
    delete this.controls;

    // delete this.stats;
  }

  _onAnimateInternal() {
    const {
      mouseInput,
      camera,
    } = this.refs;

    if (!mouseInput.isReady()) {
      const {
        scene,
        container,
      } = this.refs;

      mouseInput.ready(scene, container, camera);
      mouseInput.restrictIntersections(this.visibleRegions);
      mouseInput.setActive(false);
    }

    if (this.state.mouseInput !== mouseInput) {
      this.setState({ mouseInput });
    }

    if (this.state.camera !== camera) {
      this.setState({ camera });
    }

    // this.stats.update();
    this.controls.update();  // THIS SHOULD NOT BE COMMENTED OUT
  }

  render() {
    const {
      width,
      height,
    } = this.props;

    const {
      cameraPosition,
      cameraRotation,

      mouseInput,
      camera,

      hovering,
      dragging,
    } = this.state;

    const style = {};
    if (dragging) {
      style.cursor = 'move';
    } else if (hovering) {
      style.cursor = 'pointer';
    }

    this._cursor.hovering = hovering;
    this._cursor.dragging = dragging;


    this.visibleRegions = this.props.regions
      .filter((region) => {
        if (region.isEmpty) {
          return false;
        }
        if (region.ready) {
          return true;
        }
        region.asMesh.then(() => this.forceUpdate());
      })
      .map((region) =>
        <Region key={region.name}
                region={region}
                mouseInput={mouseInput}
                camera={camera}

                initialPosition={THREE.Vector3(0,0,0)}
                onCreate={()=> {console.log("did create");Math.random()}}
                cursor={this._cursor}/>
      );

    console.log('this.visibleRegions', this.visibleRegions)

    return (
      <div ref="container"
           style={style}>
        <React3 width={width}
                height={height}
                antialias
                pixelRatio={window.devicePixelRatio}
                mainCamera="mainCamera"
                onAnimate={this._onAnimate.bind(this)}
                sortObjects={false}
                shadowMapEnabled
                shadowMapType={THREE.PCFShadowMap}
                clearColor={0xf0f0f0}>
          <module ref="mouseInput"
                  descriptor={MouseInput}/>
          <resources>
            <boxGeometry resourceId="boxGeometry2"
                         width={40}
                         height={40}
                         depth={40}/>
            <meshBasicMaterial resourceId="highlightMaterial"
                               color={0xffff00}
                               wireframe/>
          </resources>
          <scene ref="scene">
            <perspectiveCamera fov={70}
                               aspect={width / height}
                               near={1}
                               far={10000}
                               name="mainCamera"
                               ref="camera"
                               position={cameraPosition}
                               rotation={cameraRotation}/>
            <ambientLight color={0x505050}/>
            <spotLight color={0xffffff}
                       intensity={1.5}
                       position={this.lightPosition}
                       lookAt={this.lightTarget}

                       castShadow
                       shadowCameraNear={200}
                       shadowCameraFar={10000}
                       shadowCameraFov={50}

                       shadowBias={-0.00022}

                       shadowMapWidth={2048}
                       shadowMapHeight={2048}/>
            <group>
              {this.visibleRegions}
            </group>
          </scene>
        </React3>
      </div>
    );
  }
}


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SceneCanvas)
