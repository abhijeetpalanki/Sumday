module.exports = function (api) {
  api.cache(true);
  return {
    // Do NOT add 'react-native-worklets/plugin' here. babel-preset-expo adds
    // it automatically whenever react-native-worklets is installed — its
    // `worklets` option defaults to true and covers Reanimated 4, which uses
    // the standalone worklets package. Listing it again registers the plugin
    // twice.
    presets: ['babel-preset-expo'],
  };
};
