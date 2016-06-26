// @flow

export const setShapeset = (sceneId:string, shapeset:string) => {
  return {
    type: 'SET_SHAPESET',
    sceneId,
    shapeset
  }
}

export const setVersion = (sceneId:string, version:string, build:string) => {
  var action = {
    type: 'SET_VERSION',
    sceneId,
    version
  };
  if (build) {
    var buildSplit = build.split('+');
    action.build = buildSplit[buildSplit.length - 1];
    action.fullVersionStr = `${action.version}+${action.build}`
  }
  return action;
}

export const ToggleTeapot = (sceneId:string) => {
  return {
    type: 'TOGGLE_TEAPOT',
    sceneId
  }
}

export const RegisterScene = (sceneId:string) => {
  return {
    type: 'REGISTER_SCENE',
    sceneId
  };
}
