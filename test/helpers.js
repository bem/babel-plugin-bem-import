const babel = require('babel-core');
const mock = require('mock-fs');

const plugin = require('..');

function transformSourceWithOptions(filename, { options, fs }) {
    mock(fs);

    const source = babel.transform(fs[filename], {
        filename: filename,
        babelrc: false,
        plugins: [[plugin, options]]
    }).code;

    mock.restore();

    return source;
}

module.exports = {
    babel: transformSourceWithOptions
};
