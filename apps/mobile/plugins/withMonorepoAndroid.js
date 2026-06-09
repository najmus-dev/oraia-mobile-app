const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * npm workspaces hoist react-native to the monorepo root.
 * @react-native-picker/picker Gradle needs REACT_NATIVE_NODE_MODULES_DIR set explicitly.
 */
function withMonorepoAndroid(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    const marker = 'REACT_NATIVE_NODE_MODULES_DIR';
    if (gradleConfig.modResults.contents.includes(marker)) {
      return gradleConfig;
    }
    gradleConfig.modResults.contents =
      `// Monorepo: react-native lives at repository root node_modules\n` +
      `project.ext.REACT_NATIVE_NODE_MODULES_DIR = file("../../../node_modules/react-native")\n\n` +
      gradleConfig.modResults.contents;
    return gradleConfig;
  });
}

module.exports = withMonorepoAndroid;
