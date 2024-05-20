import path from 'path';

export default {
    mode: 'production',
    target: 'node',
    entry: './src/extension.ts', // Adjust the entry point as needed
    output: {
        path: path.resolve(process.cwd(), 'out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode', // Exclude the vscode module from the bundle
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader',
            },
        ],
    },
};

