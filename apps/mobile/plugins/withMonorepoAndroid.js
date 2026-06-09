const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = 'REACT_NATIVE_NODE_MODULES_DIR';

/**
 * npm workspaces hoist react-native to the monorepo root while some native
 * modules (e.g. @react-native-picker/picker) stay under apps/mobile/node_modules.
 * Picker reads REACT_NATIVE_NODE_MODULES_DIR from rootProject.ext — set it on the
 * root android/build.gradle via Node resolution (works on EAS and locally).
 */
function withMonorepoAndroid(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.contents.includes(MARKER)) {
      return gradleConfig;
    }

    const injection =
      `// Monorepo: hoisted react-native for autolinked native modules\n` +
      `ext.${MARKER} = new File(\n` +
      `  ["node", "--print", "require.resolve('react-native/package.json')"]\n` +
      `    .execute(null, rootDir)\n` +
      `    .text\n` +
      `    .trim()\n` +
      `).getParentFile()\n\n`;

    gradleConfig.modResults.contents = injection + gradleConfig.modResults.contents;
    return gradleConfig;
  });
}

module.exports = withMonorepoAndroid;
