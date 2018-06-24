const { dirname, join } = require('path');

const rPath = require('required-path');
const { expect } = require('chai');
const { stripIndents } = require('common-tags');

const { babel, readFile } = require('../helpers');

const getOrder = str => {
    const reg = /order:.?(\d+)/g;
    const res = [];
    let match;
    while(match = reg.exec(str)) {
        res.push(Number(match[1]));
    }
    return res;
};

const regex = /require\(\'([.\/\w]+\.(\w+))'\)/g
const getRequires = str => {
  const requires = [];
  const paths = new Set();
  let match;

  while (match = regex.exec(str)) {
    const path = match[1];
    const ext = match[2];

    if (paths.has(path)) continue;

    paths.add(path);
    requires.push({ path, ext });
  }

  return requires;
};

const extractCSSFromFile = (fileName, { options, fs }) => {
    const source = babel(fileName, { options, fs });

    return getRequires(source).reduce((acc, { path, ext }) => {
        if (ext === 'css') {
            acc += readFile(fs, join(dirname(fileName), path));
        } else if (ext === 'js') {
            acc += extractCSSFromFile(path, { options, fs });
        } else {
            throw new Error('unsupported extension!');
        }
        return acc;
    }, '');
};

const checkCycledRequires = (fileName, { options, fs }) => {
    const source = babel(fileName, { options, fs });

    return getRequires(source).reduce((acc, { path, ext }) => {
        if (ext === 'js') {
            const relative = join(dirname(fileName), path);
            if (relative === fileName) {
                console.log(`cycle require: ${path} in ${fileName}`);
                return false;
            }
            return acc && checkCycledRequires(relative, { options, fs });
        }
        return acc;
    }, true);
};


describe('order', () => {
    it('order of dependent blocks', () => {
        const fs = {
            'index.js' : `require('b:select')`,
            'common.blocks' : {
                'button' : {
                    'button.css' : `.button { order: 0 }\n`
                },
                'select' : {
                    'select.css' : `.select { order: 1 }\n`,
                    'select.js' : `require('b:button')`
                }
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks'],
            techs: ['js', 'css']
        };

        const css = extractCSSFromFile('index.js', { options, fs });

        expect(getOrder(css)).to.eql([0, 1]);
    });

    it('order of modifiers', () => {
        const fs = {
            'index.js' : `require('b:button m:theme=normal|action m:size=m')`,
            'common.blocks/button' : {
                'button.css' : `.button { order: 0 }\n`,
                '_theme' : {
                    'button_theme_normal.css' : `.button_theme_normal { order: 1 }\n`,
                    'button_theme_action.css' : `.button_theme_action { order: 2 }\n`
                },
                '_size' : {
                    'button_size_m.css' : `.button_size_m, { order: 3 }\n`
                }
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks'],
            techs: ['js', 'css']
        };

        const css = extractCSSFromFile('index.js', { options, fs });

        expect(getOrder(css)).to.eql([0, 1, 2, 3]);
    });

    it('css: order of modifiers required inside block', () => {
        const fs = {
            'index.js' : `require('b:button m:theme=action m:size=m')`,
            'common.blocks/button' : {
                'button.css' : `.button { order: 0 }\n`,
                'button.js' : `require('m:theme=normal')`,
                '_theme' : {
                    'button_theme_normal.css' : `.button_theme_normal { order: 1 }\n`,
                    'button_theme_action.css' : `.button_theme_action { order: 2 }\n`
                },
                '_size' : {
                    'button_size_m.css' : `.button_size_m, { order: 3 }\n`
                }
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks'],
            techs: ['js', 'css']
        };

        const css = extractCSSFromFile('index.js', { options, fs });

        // NOTE: it's okay to have to blocks webpack would remove second css file
        expect(getOrder(css)).to.eql([0, 1, 0, 2, 3]);
    });

    it('js: order of modifiers required inside block', () => {
        const fs = {
            'index.js' : `require('b:button m:size=m')`,
            'common.blocks/button' : {
                'button.js' : `require('m:theme=normal')`,
                '_theme' : {
                    'button_theme_normal.js' : `('_theme' + '_normal')`
                },
                '_size' : {
                    'button_size_m.js' : `('_theme' + '_size')`
                }
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks']
        };

        const hasNoCycles = checkCycledRequires('index.js', { options, fs } );
        expect(hasNoCycles).to.be.true;
    });

    it('js: order no conflicts inside gemini.bemjson.js', async () => {
        const fs = {
            'gemini.bemjson.js' : `require('b:gemini')`,
            'common.blocks/gemini' : {
                'gemini.js' : `(1 + 1)`
            }
        };
        const options = {
            // Required option
            levels: ['common.blocks']
        };

        const hasNoCycles = checkCycledRequires('gemini.bemjson.js', { options, fs } );
        expect(hasNoCycles).to.be.true;
    });

});
