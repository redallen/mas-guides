const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require('webpack');
const {dependencies, federatedModuleName} = require("./package.json");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const AssetsPlugin = require('assets-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {buildQuickStart} = require('./utils/quickstart-adoc');
const ChunkMapper = require('@redhat-cloud-services/frontend-components-config/chunk-mapper');
const fileRegEx = /\.(png|woff|woff2|eot|ttf|svg|gif|jpe?g|png)(\?[a-z0-9=.]+)?$/;

module.exports = (env, argv) => {
  const isProduction = argv && argv.mode === 'production';
  return {
    entry: {
      app: path.resolve(__dirname, 'src', 'index.tsx')
    },
    module: {
      rules: [
        {
          test: /\.(tsx|ts|jsx)?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                experimentalWatchApi: true,
              }
            }
          ]
        },
        {
          test: /\.css|s[ac]ss$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
          sideEffects: true,
        },
        {
          test: fileRegEx,
          type: 'asset/resource',
        },
      ],
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: '../**/quickstart.yml',
            to: ({_context, absoluteFilename}) => {
              // The dirname of quickstart is used as the output key
              const dirName = path.basename(path.dirname(absoluteFilename));
              if (env === "development") {
                return `${dirName}.quickstart.json`
              }
              return `${dirName}.[contenthash].quickstart.json`
            },
            transform: (content, absoluteFilename) => {
              const basePath = path.dirname(absoluteFilename);
              return buildQuickStart(content, absoluteFilename, basePath, {});
            },
            noErrorOnMissing: true
          },
          {
            from: '../**/images/**/*.png',
            to: isProduction ? 'images/[contenthash:8][ext]' : 'images/[name][ext]' ,
            noErrorOnMissing: true
          }
        ]
      }),
      new AssetsPlugin({
        path: './dist',
        keepInMemory: env === "development",
        removeFullPathAutoPrefix: true
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[contenthash:8].css'
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src', 'index.html')
      }),
      new ChunkMapper({
        modules: [
          federatedModuleName
        ]
      }),
      new webpack.container.ModuleFederationPlugin({
        name: federatedModuleName,
        filename: `${federatedModuleName}${isProduction ? '[chunkhash:8]' : ''}.js`,
        exposes: {
          "./QuickStartDrawer": "./src/app/QuickStartDrawerFederated",
          "./QuickStartCatalog": "./src/app/QuickStartCatalogFederated"
        },
        shared: {
          ...dependencies,
          react: {
            eager: true,
            singleton: true,
            requiredVersion: dependencies["react"],
          },
          "react-dom": {
            eager: true,
            singleton: true,
            requiredVersion: dependencies["react-dom"],
          },
        },
      })
    ],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, './tsconfig.json')
        })
      ],
      symlinks: false,
      cacheWithContext: false
    }
  };
}
