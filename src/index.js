const { declare } = require('@babel/helper-plugin-utils');
const template = require('@babel/template').default;
const { types : t } = require('@babel/core');

const generators = require('./generators');
const bemImportToFiles = require('./bemImportToFiles');

const BABEL_VERSION = 7;

module.exports = declare((api, options) => {
    api.assertVersion(BABEL_VERSION);

    return {
        visitor: {
            Program: {
                enter(programPath, { filename }) {
                    programPath.traverse({
                        CallExpression(path) {
                            options.langs && (
                                generators.i18n = require('./generators/i18n').generate(options.langs)
                            );

                            // skip all except require('bemstring')
                            if (
                                path.node.callee.type === 'Identifier' &&
                                path.node.callee.name === 'require' &&
                                Object(path.node.arguments[0]).value
                            ) {
                                let res = bemImportToFiles(path.node.arguments[0].value, options, filename);

                                if (res !== null) {
                                    if (!res.length) {
                                        path.replaceWith(t.EmptyStatement());
                                    } else {
                                        res = res.map(({ tech, files }) => {
                                            return `${(generators[tech] || generators['*'])(files)}`;
                                        });

                                        res.length && path.replaceWith(template.ast(`[${res.join(',\n')}][0]`));
                                    }
                                }
                            }
                        },

                        ImportDeclaration(path) {
                            options.langs && (
                                generators.i18n = {
                                    es: require('./generators/i18n').esGenerate(options.langs)
                                }
                            );

                            const res = bemImportToFiles(path.node.source.value, options, filename);

                            if (res !== null) {
                                if (!res.length) {
                                    path.replaceWith(t.EmptyStatement());
                                } else {
                                    let name;
                                    const specifiers = path.node.specifiers;

                                    if (specifiers.length) {
                                        // TODO: ImportSpecifier, ImportNamespaceSpecifier and array
                                        if (specifiers[0].type === 'ImportDefaultSpecifier') {
                                            name = specifiers[0].local.name;
                                        }
                                    }

                                    const uid = id => path.scope.generateUidIdentifier(id).name;
                                    const str = res.map(({ tech, files }) => {
                                        return `${(generators[tech] || generators['*'])['es'](files, name, uid)}`;
                                    }).join('\n');

                                    path.replaceWithMultiple(template.ast(str));
                                }
                            }
                        }
                    });
                }
            }
        }
    };
});
