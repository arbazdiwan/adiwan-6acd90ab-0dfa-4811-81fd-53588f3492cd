const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...(options.resolve || {}),
      alias: {
        '@task-management/data': path.resolve(__dirname, '../../libs/data/src/index.ts'),
        '@task-management/auth': path.resolve(__dirname, '../../libs/auth/src/index.ts'),
      },
      extensions: ['.ts', '.js', '.json'],
    },
    externals: [
      nodeExternals({
        modulesDir: path.resolve(__dirname, '../../node_modules'),
        allowlist: [/@task-management\/.*/],
      }),
      nodeExternals({
        modulesDir: path.resolve(__dirname, 'node_modules'),
        allowlist: [/@task-management\/.*/],
      }),
    ],
  };
};
