const mock = require('mock-fs');
const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { transformSourceWithOptions } = require('./helpers');

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

        mock(fs);
        const source = transformSourceWithOptions(fs['index.js'], options);

        /* eslint-disable max-len */
        expect(source).to.eql(stripIndents`

        (require('./common.blocks/button/button.js').default || require('./common.blocks/button/button.js')).applyDecls();

        `);
        /* eslint-enable max-len */
    });

    afterEach(() => {
        mock.restore();
    });
});
