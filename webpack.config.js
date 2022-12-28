const path = require('path');
const PACKAGE = require('./package.json');
const CopyPlugin = require("copy-webpack-plugin");
const os = require('os')

module.exports = {
  mode: 'none',
  entry: './plugin-index.ts',
  output: {
    path: path.resolve(os.homedir(), '.Leapp/plugins', `${PACKAGE.name}`),
    filename: 'plugin.js',
    clean: true,
    library: {
      type: 'commonjs2',
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './package.json',
          to: `./package.json`}
      ]
    })
  ],
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
