module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo injects the react-native-worklets Babel plugin for you
    // on SDK 54+. If animations ever throw a "worklet not found" error after a
    // dependency change, add 'react-native-worklets/plugin' as the LAST entry
    // of a `plugins` array here.
    presets: ['babel-preset-expo'],
  };
};
