const mock = require('mock-fs');
const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { transformSourceWithOptions } = require('../helpers');

describe('Options', () => {
    describe('levels', () => {
        it('common/desktop', () => {
            const fs = {
                'index.js' : `require('b:button')`,
                'common.blocks/button' : {
                    'button.js' : `({ block: 'button', content: 'common' })`
                },
                'desktop.blocks/button' : {
                    'button.js' : `({ block: 'button', content: 'desktop' })`
                }
            };
            const options = {
                levels : [
                    'common.blocks',
                    'desktop.blocks'
                ]
            };

            mock(fs);
            const source = transformSourceWithOptions(fs['index.js'], options);

            /* eslint-disable max-len */
            expect(source).to.eql(stripIndents`
                require('./common.blocks/button/button.js'), (require('./desktop.blocks/button/button.js').default || require('./desktop.blocks/button/button.js')).applyDecls();
            `);
            /* eslint-enable max-len */
        });
    });

    afterEach(() => {
        mock.restore();
    });
});
