import AtlasClient from '../lib/atlas-client';

var ac = new AtlasClient();


// TODO: track active requests to allow reuse of active requests

export default store => next => action => {
  if (action.type !== 'FETCH_ATLAS_DATA') {
    return next(action);
  }

  switch (action.asset) {
    case 'SHAPESETS':
      ac.listShapesets()
        .then(({shapesets}) => {
          store.dispatch({
            type: 'RECIEVE_DATA',
            shapesets
          });
          return ac.listVersions(shapesets[0]);
        });
      return;

    case 'VERSIONS':
      ac.listVersions(action.name)
        .then(({name, versions}) => {
          store.dispatch({
            type: 'RECIEVE_DATA',
            name,
            versions
          });
        });
      return;

    case 'SHAPESET':
      let scene = store.getState().get('scenes').get(action.sceneId);
      let name = scene.get('activeShapeset');
      let version = scene.get('activeVersion');
      let build = scene.get('activeBuild');
      if (!action.force && shapesetExists(store.getState(), name, version, build)) {
        return;
      }
      ac.getShapeset(name, version)
        .then((manifest) => store.dispatch({
            type: 'RECIEVE_DATA',
            manifest: manifest
          })
        );
      return;
  }
};

function shapesetExists(state, name, version, build) {
  var fullVersionStr = `${version}+${build}`;
  return state.hasIn(['shapesets', 'shapes', name, fullVersionStr]);
}
