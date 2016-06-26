import { List, Map, Set } from 'immutable';
import AtlasClient from '../lib/atlas-client';
export const state = {};


export const reducer = (state, action) => {
  switch (action.type) {
    case 'REGISTER_SCENE':
      return state
        .set(action.sceneId, Map({
          activeShapeset: undefined,
          activeVersion: undefined,
          regions: Map()
        }));

    case 'TOGGLE_TEAPOT':
      let target = state.get(action.sceneId);
      return state
        .set(action.sceneId, target.set('teapot', !target.get('teapot')));

    case 'SET_SHAPESET':
      return state.set(action.sceneId, reduceScene(state.get(action.sceneId), action));

    case 'SET_VERSION':
      return state.set(action.sceneId, reduceScene(state.get(action.sceneId), action));

    case 'CREATE_REGION':
      return state.set(action.sceneId, reduceScene(state.get(action.sceneId), action));

    case 'DESTORY_REGION':
      return state.set(action.sceneId, reduceScene(state.get(action.sceneId), action));

    case 'TOGGLE_SHAPE':
      return state.set(action.sceneId, reduceScene(state.get(action.sceneId), action));

    default:
      return state;
  }
}


function reduceScene(sceneState, action) {
  var regions = sceneState.get('regions');
  var shapeset = sceneState.get('activeShapeset');
  var version = sceneState.get('activeVersion');
  var buildVersion = sceneState.get('activeBuild');
  var fullVersionStr = `${version}+${buildVersion}`;

  switch (action.type) {
    case 'SET_SHAPESET':
      return sceneState
        .set('activeShapeset', action.shapeset)
        .set('activeVersion', undefined)
        .set('activeBuild', undefined);

    case 'SET_VERSION':
      return sceneState.withMutations((s) => {
        s.set('activeVersion', action.version);
        // also set active build if given or clear if version changed
        if (action.build) {
          let buildParts = action.build.split('+');
          s.set('activeBuild', buildParts[buildParts.length-1]);

        if (!s.get('regions').has(shapeset) && action.build) {
          s.setIn(['regions', shapeset], Map({ [action.fullVersionStr]: Map() }));
        } else if (!s.get('regions').get(shapeset).has(action.version) && action.build) {
          s.setIn(['regions', shapeset, action.fullVersionStr], Map());
        }
        } else if (version !== action.version) {
          s.set('activeBuild', undefined);
        }
      });

    case 'CREATE_REGION':
      return sceneState.setIn(['regions', shapeset, fullVersionStr, action.name],
        newRegion(action.name, shapeset, fullVersionStr));

    case 'DESTORY_REGION':
      action.region.destroy();
      return sceneState.deleteIn(['regions', shapeset, fullVersionStr], action.region);

    case 'TOGGLE_SHAPE':
      // replace region with modified region
      var updatedRegion = action.region.toggleShape(action.shape);
      action.region.destroy();
      return sceneState.setIn(
        ['regions', shapeset, fullVersionStr, action.region.name],
        updatedRegion)
  }
  return sceneState;
}

function newRegion(name, shapeset, version, ac) {
  return new AtlasClient.Region(name, shapeset, version, [], ac);
}
