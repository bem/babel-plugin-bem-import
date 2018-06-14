const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { babel } = require('./helpers');

describe('Pugin', () => {
    it('Defaults', () => {
        const fs = {
            'index.js' : `require('b:button')`,
            'common.blocks/button' : {
                'button.js' : `({ block: 'button' })`,
                'button.css' : `.button { }`
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks']
        };

        const source = babel('index.js', { options, fs });

        /* eslint-disable max-len */
        expect(source).to.eql(stripIndents`

        (require('./common.blocks/button/button.js').default || require('./common.blocks/button/button.js')).applyDecls();

        `);
        /* eslint-enable max-len */
    });
});