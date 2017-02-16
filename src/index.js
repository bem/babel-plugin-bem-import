const fs = require('fs'),
    path = require('path'),
    bn = require('@bem/naming'),
    BemCell = require('@bem/cell'),
    BemEntityName = require('@bem/entity-name'),
    bemFs = require('@bem/fs-scheme')(),
    bemImport = require('@bem/import-notation'),
    requiredPath = require('required-path'),
    template = require('babel-template'),
    logSymbols = require('log-symbols'),
    generators = require('./generators');

module.exports = function({ types: t }) {

return {
    visitor: {
        CallExpression(p, { opts: { naming, levels, techs=['js'] }, opts, file: { opts: { filename } } }) {
            const techMap = techs.reduce((acc, tech) => {
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
            namingOptions = naming || 'react',
            bemNaming = bn(namingOptions);

            if (
                p.node.callee.type === 'Identifier' &&
                p.node.callee.name === 'require' &&
                p.node.arguments[0] && p.node.arguments[0].value
            ) {

                const bemFiles = bemImport.parse(
                    p.node.arguments[0].value,
                    bemNaming.parse(path.basename(filename).split('.')[0])
                )
                // expand entities by all provided levels
                .reduce((acc, entity) => {
                    levels.forEach(layer => {
                        // if entity has tech get extensions for it or exactly it,
                        // otherwise expand entities by default extensions
                        (entity.tech? techMap[entity.tech] || [entity.tech] : defaultExts).forEach(tech => {
                            acc.push(BemCell.create({ entity, tech, layer }));
                        });
                    });
                    return acc;
                }, [])
                // find path for every entity and check it existance
                .map(bemCell => {
                    const entityPath = path.resolve(process.cwd(), bemFs.path(bemCell, namingOptions));
                    // BemFile
                    return {
                        cell : bemCell,
                        exist : fs.existsSync(entityPath),
                        // prepare path for require cause relative returns us string that we couldn't require
                        path : requiredPath(path.relative(path.dirname(filename), entityPath))

                    };
                });

                if (!bemFiles.length) {
                    return;
                }

                /**
                 * techToFiles:
                 *   js: [enity, entity]
                 *   css: [entity, entity, entity]
                 *   i18n: [entity]
                 */
                const techToFiles = {},
                    existsEntities = {},
                    errEntities = {};

                bemFiles.forEach(file => {
                    const {cell: {tech,  entity}} = file,
                        {id, block, elem, modName} = entity;

                    if(!file.exist) {
                        existsEntities[id] || (existsEntities[id]  = false);
                        (errEntities[id] || (errEntities[id] = [])).push(file);
                        return;
                    }

                    (techToFiles[tech] || (techToFiles[tech] = [])).push(file);
                    existsEntities[id] = true;

                    // Add existence for `_mod` if `_mod_val` exists.
                    entity.mod && !entity.isSimpleMod() &&
                        (existsEntities[
                            BemEntityName.create({ block, elem, modName }).id
                        ] = true);
                });

                Object.keys(existsEntities).forEach(fileId => {
                    // check if entity has no tech to resolve
                    existsEntities[fileId] || errEntities[fileId].forEach(file => {
                        console.warn(`${logSymbols.warning} BEM module not found: ${file.path}`);
                    });
                });
                // Each tech has own generator
                const values = Object.keys(techToFiles).map(tech =>
                    (generators[extToTech[tech] || tech] || generators['*'])(techToFiles[tech])
                );
                if (values.length) {
                    p.replaceWith(template(values.join('\n'))());
                }
            }
        }
    }
};
}
