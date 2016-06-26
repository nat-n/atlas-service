// @flow

export const fetchShapesets = (force:boolean = false) => {
  return {
    type: 'FETCH_ATLAS_DATA',
    asset:'SHAPESETS',
    force: force
  };
}

export const fetchVersions = (shapesetName:string, force:boolean = false) => {
  return {
    type: 'FETCH_ATLAS_DATA',
    asset: 'VERSIONS',
    name: shapesetName,
    force: force
  };
}

export const fetchShapeset = (sceneId:string, force:boolean = false) => {
  return {
    type: 'FETCH_ATLAS_DATA',
    asset: 'SHAPESET',
    sceneId: sceneId,
    force: force
  };
}
