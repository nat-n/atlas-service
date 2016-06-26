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
  }

  componentDidMount() {
    this.props.registerScene(this.props.sceneId);
  }

  componentWillReceiveProps(nextProps) {
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

      removedRegions.forEach(this.removeRegion.bind(this));
      addedRegions.forEach(this.addRegion.bind(this));
    }
  }

  // shouldComponentUpdate(nextProps, nextState) {
  //   return false;
  // }

  removeRegion(region) {
    console.log("TODO: remove region:", region)
  }

  addRegion(region) {
    console.log("TODO: add region:", region)
  }

  render() {
    return (
      <div className="scene-canvas">
        foo
      </div>
    );
  }
}


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SceneCanvas)
