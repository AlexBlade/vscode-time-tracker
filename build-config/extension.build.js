const path = require('path');

const extensionBuild = (mode) => {
    const buildMode = mode;
    const buildTag = buildMode === 'production' ? '' : '.dev';
    const devTool = buildMode === 'production' ? '' : 'source-map';
    const plugins = [];

    /**@type {import('webpack').Configuration}*/
    const config = {
        name: 'vscode-time-tracker',
        mode: buildMode,
        devtool: devTool,
        target: 'node',
        entry: {
            'tracker': './src/extension.ts'
        },
        resolve: {
            extensions: ['.ts', '.js', '.json']
        },
        output: {
            filename: `[name]${buildTag}.js`,
            path: path.resolve(__dirname, '../dist'),
            libraryTarget: 'commonjs2'
        },
        optimization: {
            usedExports: true
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    exclude: [/node_modules/, /dist/, /build-config/]
                }
            ]
        },
        externals: {
            vscode: 'commonjs vscode'
        }
    };

    return config;
};

module.exports = extensionBuild;
