const plugin = require('..');
const babel = require('babel-core');

const { stripIndents } = require('common-tags');
const mockFS = require('mock-fs');
const chai = require('chai');
const expect = chai.expect;


describe('Pugin', () => {
    it('Defaults', async () => {
        const mock = {
            'index.js' : `require('b:button')`,
            'common.blocks/button' : {
                'button.js' : `({ block: 'button' })`,
                'button.css' : `.button { }`
            }
        };

        const options = {
            // Required option
            "levels": ['common.blocks'],
            // "naming": {
            //   "elem": "__",
            //   "elemDirPrefix": "__",
            //   "modDirPrefix": "_"
            // },
        };

        mockFS(mock);

        const source = babel.transform(mock['index.js'], {
            // cwd: process.cwd(),
            filename: 'index.js',
            babelrc: false,
            plugins: [[plugin, { levels: options.levels, /* naming: options.naming */ }]]
        }).code;

        // console.log(source);

        /* eslint-disable max-len */
        expect(source).to.eql(stripIndents`
        (require('./common.blocks/button/button.js').default || require('./common.blocks/button/button.js')).applyDecls();
        `);
        /* eslint-enable max-len */

        mockFS.restore();
    });
});

