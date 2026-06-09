const { getDefaultConfig } = require('expo/metro-config');

/** Expo SDK 52+ configures Metro for npm workspaces automatically. */
module.exports = getDefaultConfig(__dirname);
