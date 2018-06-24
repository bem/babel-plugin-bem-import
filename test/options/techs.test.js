const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { babel } = require('../helpers');

describe('Options', () => {
    describe('techs && techMap', () => {
        it('only ts', async () => {
            const fs = {
                'index.ts' : `require('b:button')`,
                'common.blocks/button' : {
                    'button.ts' : `({ block: 'button' })`
                },
                'desktop.blocks/button' : {
                    'button.ts' : `({ block: 'button', content: 'desktop' })`
                }
            };
            const options = {
                levels : ['common.blocks', 'desktop.blocks'],
                // this is default
                techs : ['js'],
                techMap : {
                    // to work with bem-react-core
                    // we need to map js to ts
                    js : ['ts']
                }
            };


            const source = babel('index.ts', { options, fs });
            /* eslint-disable max-len */
            expect(source).to.eql(stripIndents`[(
                require('./common.blocks/button/button.ts'), 
                (require('./desktop.blocks/button/button.ts').default || require('./desktop.blocks/button/button.ts')).applyDecls()
            )][0];`.replace(/\n/g, ''));
            /* eslint-enable max-len */
        });

        // TODO: https://github.com/bem/webpack-bem-loader/issues/67
        // They need to work together as one tech
        it.skip('ts & js on different levels', () => {
            const fs = {
                'index.ts' : `require('b:button')`,
                'common.blocks/button' : {
                    'button.ts' : `({ block: 'button' })`
                },
                'desktop.blocks/button' : {
                    'button.js' : `({ block: 'button', content: 'I love js' })`
                }
            };
            const options = {
                levels : [
                    'common.blocks',
                    'desktop.blocks'
                ],
                techMap : {
                    js : ['ts', 'js']
                }
            };

            const source = babel('index.ts', { options, fs });

            console.log(source);
        });

        // TODO: https://github.com/bem/webpack-bem-loader/issues/68
        // We need to choose one if we have both extensions on one level
        it.skip('ts & js on same levels', () => {
            const fs = {
                'index.ts' : `require('b:button')`,
                'common.blocks/button' : {
                    'button.ts' : `({ block: 'button' })`,
                    'button.js' : `({ block: 'button', content: 'I love js' })`
                }
            };
            const options = {
                levels : ['common.blocks'],
                techMap : {
                    js : ['ts', 'js']
                }
            };

            const source = babel('index.ts', { options, fs });

            console.log(source);
        });

        it('js & css', () => {
            const fs = {
                'index.js' : `require('b:button')`,
                'common.blocks/button' : {
                    'button.js' : `({ block: 'button' })`,
                    'button.css' : `.button { }`
                }
            };

            const options = {
                levels : [
                    'common.blocks'
                ],
                techs : ['js', 'css']
            };

            const source = babel('index.js', { options, fs });

            /* eslint-disable max-len */
            expect(source).to.eql(stripIndents`[
                (require('./common.blocks/button/button.js').default || require('./common.blocks/button/button.js')).applyDecls()
                , require('./common.blocks/button/button.css')
            ][0];`.replace(/\n/g, ''));
            /* eslint-enable max-len */
        });
    });
});
