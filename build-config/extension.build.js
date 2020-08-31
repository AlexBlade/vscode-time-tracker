const path = require('path');

const extensionBuild = (mode) => {
    const buildMode = mode;
    const buildTag = buildMode === 'production' ? '' : '.dev';
    const devTool = buildMode === 'production' ? '' : 'source-map';
    const plugins = [];

    return {
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
            path: path.resolve(__dirname, '../dist')
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
            'vscode': 'vscode'
        }
    };
};

module.exports = extensionBuild;
