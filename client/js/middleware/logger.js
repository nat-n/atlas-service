
export default store => next => action => {
  var logGroup = 'Action: ' + action.type;
  (console.groupCollapsed || console.group).call(console, logGroup);
  console.log('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState().toJS());
  console.groupEnd(logGroup);
  return result
}
