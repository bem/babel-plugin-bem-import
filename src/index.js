const fs = require('fs'),
    path = require('path'),
    bn = require('@bem/naming'),
    BemCell = require('@bem/cell'),
    BemEntityName = require('@bem/entity-name'),
    bemFs = require('@bem/fs-scheme'),
    bemImport = require('@bem/import-notation'),
    bemConfig = require('bem-config')(),
    requiredPath = require('required-path'),
    template = require('babel-template'),
    logSymbols = require('log-symbols'),
    generators = require('./generators');

module.exports = function({ types : t }) {

    return {
        visitor : {
            CallExpression(p, { opts, file : { opts : { filename } } }) {
                const { naming, techs=['js'] } = opts,
                    levelsMap = opts.levels || bemConfig.levelMapSync(),
                    levels = Array.isArray(levelsMap) ? levelsMap : Object.keys(levelsMap),
                    techMap = techs.reduce((acc, tech) => {
                        acc[tech] || (acc[tech] = [tech]);
                        return acc;
                    }, opts.techMap || {}),
                    extToTech = Object.keys(techMap).reduce((acc, tech) => {
                        techMap[tech].forEach(ext => {
                            acc[ext] = tech;
                        });
                        return acc;
                    }, {}),
                    defaultExts = Object.keys(extToTech),
                    unifyPath = path => path.replace(/\\/g, '/'),
                    namingOptions = naming || 'react',
                    bemNaming = bn(namingOptions),
                    currentEntityName = path.basename(filename),
                    currentEntity = bemNaming.parse(currentEntityName.split('.')[0]),
                    currentEntityTech = extToTech[currentEntityName.substr(currentEntityName.indexOf('.') + 1)];


                opts.langs && (generators.i18n = require('./generators/i18n').generate(opts.langs));

                // skip all except require('bemstring')
                if(!(
                    p.node.callee.type === 'Identifier' &&
                p.node.callee.name === 'require' &&
                Object(p.node.arguments[0]).value
                )) return;

                const bemFiles = bemImport.parse(
                    p.node.arguments[0].value,
                    currentEntity
                )
                    // expand entities by all provided levels
                    .reduce((acc, entity) => {
                        levels.forEach(layer => {
                            // if entity has tech get extensions for it or exactly it,
                            // otherwise expand entities by default extensions
                            (entity.tech? techMap[entity.tech] || [entity.tech] : defaultExts).forEach(tech => {
                                if(!(
                                    currentEntity.isEqual(BemEntityName.create(entity)) &&
                                    currentEntityTech === 'js' &&
                                    extToTech[tech] === 'js'
                                )) {
                                    acc.push(BemCell.create({ entity, tech, layer }));
                                }
                            });
                        });
                        return acc;
                    }, [])
                    // find path for every entity and check it existance
                    .map(bemCell => {
                        const localNamingOpts = levelsMap[bemCell.layer] && levelsMap[bemCell.layer].naming
                            || namingOptions;
                        const fsScheme = levelsMap[bemCell.layer] && levelsMap[bemCell.layer].scheme
                            || 'nested';

                        const entityPath = path.resolve(bemFs(fsScheme).path(bemCell, localNamingOpts));
                        // BemFile
                        return {
                            cell : bemCell,
                            exist : fs.existsSync(entityPath),
                            // prepare path for require cause relative returns us string that we couldn't require
                            path : unifyPath(requiredPath(path.relative(path.dirname(filename), entityPath)))
                        };
                    });

                if(!bemFiles.length) return;

                /**
                 * extToFiles:
                 *   js: [enity, entity]
                 *   css: [entity, entity, entity]
                 *   i18n: [entity]
                 */
                const extToFiles = {},
                    existsEntities = {},
                    errEntities = {};

                bemFiles.forEach(file => {
                    const { cell : { tech,  entity } } = file,
                        { id, block, elem, modName } = entity;

                    if(!file.exist) {
                    // there are no realizations found neither on levels not in techs
                        existsEntities[id] || (existsEntities[id] = false);
                        (errEntities[id] || (errEntities[id] = [])).push(file);
                        return;
                    }

                    (extToFiles[tech] || (extToFiles[tech] = [])).push(file);
                    existsEntities[id] = true;

                    // Add existence for `_mod` if `_mod_val` exists.
                    entity.isSimpleMod() === false &&
                        (existsEntities[BemEntityName.create({ block, elem, modName }).id] = true);
                    // Add existance for elem if __elem_mod exists.
                    entity.elem &&
                        (existsEntities[BemEntityName.create({ block, elem }).id] = true);
                });

                Object.keys(existsEntities).forEach(fileId => {
                    // check if entity has no tech to resolve
                    existsEntities[fileId] || errEntities[fileId].forEach(file => {
                        console.warn(`${logSymbols.warning} BEM module not found: ${file.path}`);
                    });
                });

                // Each tech has own generator
                const res = Object.keys(extToFiles)
                    // use techs from config for order
                    // so the first one would be default, `js` in most cases
                    .sort((a, b) => techs.indexOf(extToTech[a]) - techs.indexOf(extToTech[b]))
                    .map((ext) => {
                        const tech = extToTech[ext] || ext;
                        return `${(generators[tech] || generators['*'])(extToFiles[ext])}`;
                    });

                p.replaceWith(res.length ? template(`[${res.join(',\n')}][0]`)() : t.EmptyStatement());
            }
        }
    };
};
