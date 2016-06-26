import React from 'react';
import { connect } from 'react-redux'
import { List, Map, Set as ImSet} from 'immutable';
import { ToggleTeapot, setShapeset, setVersion } from '../actions/scene'
import { fetchShapeset, fetchVersions } from '../actions/atlas-data';

const mapStateToProps = (state, ownProps) => {
  return {
    isTeatime: (
      state.get('scenes').has(ownProps.sceneId) &&
      state.get('scenes').get(ownProps.sceneId).get('teapot')
    ),
    shapesets: state.get('shapesets').get('shapesetNames') || List(),
    versions: (() =>{
      try {
        let activeShapeset = state.getIn(['scenes', ownProps.sceneId, 'activeShapeset']);
        return state
          .getIn(['shapesets', 'shapesetVersions', activeShapeset])
          .keySeq() || List();
      } catch(e) {
        return List();
      }
    })(),
    activeShapeset: state.getIn(['scenes', ownProps.sceneId, 'activeShapeset']),
    activeVersion: state.getIn(['scenes', ownProps.sceneId, 'activeVersion']),
    activeBuild: state.getIn(['scenes', ownProps.sceneId, 'activeBuild']),
    get availableBuilds() {
      var activeShapeset = state.getIn(['scenes', ownProps.sceneId, 'activeShapeset']);
      var activeVersion = state.getIn(['scenes', ownProps.sceneId, 'activeVersion']);
      return state.getIn(['shapesets', 'shapesetVersions', activeShapeset, activeVersion])
    },
    shapes: (() => {
      try {
        let activeShapeset = state.getIn(['scenes', ownProps.sceneId, 'activeShapeset']);
        let activeVersion = state.getIn(['scenes', ownProps.sceneId, 'activeVersion']);
        let activeBuild = state.getIn(['scenes', ownProps.sceneId, 'activeBuild']);
        return state.getIn(['shapesets', 'shapes', activeShapeset, activeVersion+'+'+activeBuild])
          .valueSeq().toJS();
      } catch (e) {
        return [];
      }
    })(),
    regions: (() => {
      try {
        let activeShapeset = state.getIn(['scenes', ownProps.sceneId, 'activeShapeset']);
        let activeVersion = state.getIn(['scenes', ownProps.sceneId, 'activeVersion']);
        let activeBuild = state.getIn(['scenes', ownProps.sceneId, 'activeBuild']);
        return state.getIn(['scenes', ownProps.sceneId, 'regions', activeShapeset, activeVersion+'+'+activeBuild]) || Map();
      } catch (e) {
        return Map();
      }
    })()
  }
}


const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    toggleTeapot: (id) => () => dispatch(ToggleTeapot(id)),
    setShapeset(shapesetName) {
      dispatch(setShapeset(ownProps.sceneId, shapesetName));
      // ensure versions list is available
      dispatch(fetchVersions(shapesetName));
    },
    setVersion(version, build) {

      console.log("setVersion", version, build)

      dispatch(setVersion(ownProps.sceneId, version, build));
      if (version) {
        // ensure manifest for this version is available
        dispatch(fetchShapeset(ownProps.sceneId));
      }
    },
    createRegion(name) {
      dispatch({
        type: 'CREATE_REGION',
        sceneId: ownProps.sceneId,
        name
      });
    },
    toggleShape(region, shape) {
      dispatch({
        type: 'TOGGLE_SHAPE',
        sceneId: ownProps.sceneId,
        region,
        shape
      });
    },
    destroyRegion(region) {
      dispatch({
        type: 'DESTORY_REGION',
        sceneId: ownProps.sceneId,
        region
      });
    },
    toggleRegionVisibility(region) {
      dispatch({
        type: 'TOGGLE_REGION_VISIBILITY',
        sceneId: ownProps.sceneId,
        region
      });
    }
  };
};


const SceneControls = React.createClass({
  getInitialState() {
    return {
      newRegion: 'new region',
      activeRegionName: undefined
    };
  },

  createRegion(e) {
    e.preventDefault();
    if (this.state.newRegion.length) {
      if (!this.props.regions.has(this.state.newRegion)) {
        this.props.createRegion(this.state.newRegion);
      }
      this.selectRegion(this.state.newRegion);
      this.state.newRegion = '';
    }
  },

  destroyRegion() {
    if (this.state.activeRegionName) {
      this.props.destroyRegion(this.activeRegion());
    }
  },

  toggleRegionVisibility() {
    if (this.state.activeRegionName) {
      this.props.toggleRegionVisibility(this.activeRegion());
    }
  },

  selectRegion(regionName) {
    this.setState({'activeRegionName': regionName});
  },

  activeRegion() {
    return this.props.regions.get(this.state.activeRegionName);
  },

  componentWillReceiveProps(nextProps) {
    if (this.props.shapesets !== nextProps.shapesets) {
      this.props.setShapeset(nextProps.shapesets.get(0));
    }

    // or better be more conservative in recieving the FETCH_ATLAS_DATA object

    // if available version have changed
    // var thisVersionsSeq = this.props.versions.valueSeq();
    // var nextVersionsSeq = nextProps.versions.valueSeq();
    // if (thisVersionsSeq.count() !== nextVersionsSeq.count() ||
    //     !thisVersionsSeq.isSubset(nextVersionsSeq)) {
    //   console.log("IT CHANGED")
    //   this.props.setVersion(nextProps.versions.get(0));
    // }
    var thisVersionsSeq = this.props.versions.valueSeq();
    var nextVersionsSeq = nextProps.versions.valueSeq();
    if (this.props.versions !== nextProps.versions) {
      this.props.setVersion(nextProps.versions.get(0));
    }

    // select latest build on version change/load
    if (this.props.availableBuilds !== nextProps.availableBuilds && this.props.availableBuilds) {
      let latestBuild = nextProps.availableBuilds.toSeq().toArray().reduce((a, b) => a > b ? a : b);
      this.props.setVersion(this.props.activeVersion, latestBuild);
    }

    if (!nextProps.regions.has(this.state.activeRegionName)) {
      let firstRegion = nextProps.regions.toArray()[0];
      if (firstRegion) {
        this.selectRegion(firstRegion.name);
      } else {
        this.selectRegion();
      }
    }
  },

  render() {
    var activeRegion = this.activeRegion();
    var activeRegionVisibilityLabel = activeRegion && activeRegion.visible ? 'hide' : 'show';
    return (
      <div style={{borderRadius: '2px',backgroundColor:'#ccc'}}>
        <div>
          <span>
            <select name="shapeset" value={this.state.activeShapeset} onChange={(s) => this.props.setShapeset(s.target.value)}>
              {(this.props.shapesets).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </span>
          <span>
            <select name="version" value={this.state.activeVersion} onChange={(v) => this.props.setVersion(v.target.value)}>
              {(this.props.versions).map((version) => <option key={version}  value={version}>{version}</option>)}
            </select>
          </span>
          <span>
            <select name="region" value={this.state.activeRegionName} onChange={(r) => this.selectRegion(r.target.value)}>
              {this.props.regions.toArray().map((region) => <option key={region.name} value={region.name}>{region.name}</option>)}
            </select>
          </span>
          <span>
            <form name="createRegion" style={{display: 'inherit'}} onSubmit={this.createRegion}>
              <input value={this.state.newRegion} onChange={(r)=> this.setState({newRegion: r.target.value})}/>
            </form>
          </span>
          <span>
            <button onClick={this.destroyRegion}>
              Destroy Region
            </button>
          </span>
          <span>
            <button onClick={this.toggleRegionVisibility}>
              {activeRegionVisibilityLabel}
            </button>
          </span>
        </div>
        <div style={{display: 'inline-block', width: '100%'}}>
          {this.availableShapes()}
        </div>
      </div>
    );
  },

  availableShapes() {
    if (!this.state.activeRegionName) {
      return;
    }

    // exclude shapes included in other regions
    var shapesInOtherRegions = new Set();
    this.props.regions.forEach((otherRegion) => {
      if (otherRegion.name !== this.state.activeRegionName) {
        this.props.shapes.forEach((shape) => {
          // TODO: not this, once we've solved the shape cloning mystery
          if (otherRegion.hasShape(shape)) {
            shapesInOtherRegions.add(shape);
          }
        });
      }
    });

    return this.props.shapes
      .filter((s) => !shapesInOtherRegions.has(s))
      .map((shape) => this.shapeToggle(shape));
  },

  shapeToggle(shape) {
    var activeRegion = this.activeRegion();
    var styles = { float: 'left', marginRight: '3px' };
    if (activeRegion && activeRegion.hasShape(shape)) {
      styles.backgroundColor = 'blue';
    }
    return (
      <span key={shape.label}
            onClick={() => this.props.toggleShape(activeRegion, shape)}
            style={styles}>{shape.label}</span>
    )
  }
});


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SceneControls)
