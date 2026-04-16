import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (env = {}) => {
  const browser = env.browser === 'firefox' ? 'firefox' : 'chrome';
  const outDir = browser === 'firefox' ? 'dist-firefox' : 'dist';
  const manifestSrc = browser === 'firefox' ? 'manifest.firefox.json' : 'manifest.json';

  return {
    entry: {
      background: './src/background/service-worker.ts',
      content: './src/content/interceptor.ts',
      relay: './src/content/relay.ts',
      widget: './src/content/widget.ts',
      popup: './src/popup/popup.ts',
    },
    output: {
      path: path.resolve(__dirname, outDir),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: { loader: 'ts-loader', options: { transpileOnly: true } },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: manifestSrc, to: 'manifest.json' },
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/popup/popup.css', to: 'popup.css' },
          { from: 'assets/icons', to: 'icons', noErrorOnMissing: true },
        ],
      }),
    ],
    devtool: 'source-map',
  };
};
