const babel = require('babel-core');
const mock = require('mock-fs');

const plugin = require('..');

function readFile(fs, path) {
    let prevPart;
    const res = path.split('/').reduce((fs, part) => {
        if (part === '.') {
            return fs;
        }
        if (fs[part]) {
            return fs[part];
        }
        if (prevPart) {
            return fs[prevPart + '/' + part];
        } else {
            prevPart = part;
        }
        return fs;
    }, fs);
    if (typeof res === 'string') {
        return res;
    }
    throw new Error(`no such file: ${path}`);
};

function transformSourceWithOptions(path, { options, fs }) {
    mock(fs);

    try {
        const source = readFile(fs, path);
        const result = babel.transform(source, {
            filename: path,
            babelrc: false,
            plugins: [[plugin, options]]
        }).code;

        return result;
    } catch(err) {
        throw err;
    } finally {
        mock.restore();
    }
}

module.exports = {
    babel: transformSourceWithOptions,
    readFile
};
