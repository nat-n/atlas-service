/* global __dirname */

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const dir_client  = path.resolve(__dirname, 'client');
const dir_js      = path.resolve(dir_client, 'js');
const dir_html    = path.resolve(dir_client, 'html');
const dir_scenejs = path.resolve(dir_client, 'vendor/scenejs');
const dir_build   = path.resolve(dir_client, 'dist');

module.exports = {
  entry: path.resolve(dir_js, 'main.jsx'),
  output: {
    path: dir_build,
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: dir_build,
  },
  module: {
    loaders: [
      { test: dir_js, loader: 'babel-loader' },
      { test: /\.css$/, loader: "style-loader!css-loader" },
      { test: /\.png$/, loader: "url-loader?limit=100000" },
      { test: /\.jpg$/, loader: "file-loader" },
      { test: /\.scss$/, loaders: ["style", "css", "sass"] }
    ]
  },
  plugins: [
    // Simply copies the files over
    new CopyWebpackPlugin([
      { from: dir_html }, // to: output.path
      { from: dir_scenejs } // to: output.path
    ]),
    // Avoid publishing files when compilation fails
    new webpack.NoErrorsPlugin()
  ],
  stats: {
    // Nice colored output
    colors: true
  },
  // Create Sourcemaps for the bundle
  devtool: 'source-map',
  resolve: {
    modulesDirectories: ['node_modules', 'bower_components'],
  },
};
