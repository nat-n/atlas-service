import { List, Map, Set, fromJS } from 'immutable';


export const state = {
  shapesetNames: [],
  shapesetVersions: {},
  shapes: {}
};


export const reducer = (state, action) => {
  switch (action.type) {
    case 'RECIEVE_DATA':

      // load shapeset names if given
      if (action.hasOwnProperty('shapesets')) {
        return state.set('shapesetNames', List(action.shapesets))
      }

      // load versions if given
      if (action.hasOwnProperty('versions')) {
        return state.withMutations((s) => {
          if (s.hasIn(['shapesetVersions', action.name])) {
            // create entry for each new version
            action.versions.forEach((version) => {
              if (!s.hasIn(['shapesetVersions', action.name, version])) {
                s.setIn(['shapesetVersions', action.name, version], Set());
              }
            });
          } else {
            // create map with entry for each version
            s.setIn(['shapesetVersions', action.name], Map(
              action.versions.reduce((acc, version) => {
                acc[version] = Set();
                return acc;
              }, {})
            ));
          }
        });
      }

      // load shapeset build/manifest if given
      if (action.hasOwnProperty('manifest')) {
        let manifest = action.manifest;
        let [versionStr, versionBuild] = manifest.version.split('+');

        return state.withMutations((s) => {

          // update version with this build
          if (s.hasIn(['shapesetVersions', manifest.name, versionStr])) {
            s.setIn(['shapesetVersions', manifest.name, versionStr],
              s.getIn(['shapesetVersions', manifest.name, versionStr])
                .add('+' + versionBuild));
          } else {
            s.setIn(['shapesetVersions', manifest.name],
              Map({[versionStr]: Set([versionBuild])}));
          }

          // prepare shapes to be stored
          var shapes = manifest.shapes.reduce((acc, shape) => {
            acc[shape.label] = shape;
            return acc;
          }, {});

          if (!s.has('shapes')) {
            return s.set('shapes', fromJS({
              [manifest.name]: {
                [manifest.version]: shapes
              }
            }));
          } else if (!s.hasIn(['shapes', manifest.name])) {
            return s.set('shapes', s.get('shapes').set(manifest.name, fromJS({
              [manifest.version]: shapes
            })));
          } else if (!s.hasIn(['shapes', manifest.name, manifest.version])) {
            return s.setIn(['shapes', manifest.name, manifest.version], shapes);
          }
        });
      }
  }
  return state
}
