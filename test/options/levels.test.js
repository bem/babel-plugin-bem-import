const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { babel } = require('../helpers');

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

            const source = babel('index.js', { options, fs });

            /* eslint-disable max-len */
            expect(source).to.eql(stripIndents`[(
                require('./common.blocks/button/button.js'), (require('./desktop.blocks/button/button.js').default || require('./desktop.blocks/button/button.js')).applyDecls()
            )][0];`.replace(/\n/g, ''));
            /* eslint-enable max-len */
        });
    });
});
