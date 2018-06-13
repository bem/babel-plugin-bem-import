const plugin = require('..');
const babel = require('babel-core');

function transformSourceWithOptions(source, options) {
    return babel.transform(source, {
        filename: 'index.js',
        babelrc: false,
        plugins: [[plugin, options]]
    }).code;
}

module.exports = {
    transformSourceWithOptions
};
