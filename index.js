const fs = require('fs'),
    path = require('path'),
    bn = require('@bem/naming'),
    BemCell = require('@bem/cell'),
    BemEntityName = require('@bem/entity-name'),
    bemFs = require('@bem/fs-scheme')(),
    bemImport = require('@bem/import-notation'),
    template = require('babel-template'),
    logSymbols = require('log-symbols');

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
            generators = require('./generators'),
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
                        (
                            entity.tech ?
                                techMap[entity.tech] || [entity.tech] :
                                defaultExts
                        ).forEach(tech => {
                            acc.push(BemCell.create({ entity, tech, layer }));
                        });
                    });
                    return acc;
                }, [])
                // find path for every entity and check it existance
                .map(bemCell => {
                    const entityPath = path.resolve(
                            process.cwd(),
                            bemFs.path(bemCell, namingOptions)
                        );

                    const pathHack = path.relative(path.dirname(filename), entityPath);
                    // BemFile
                    return {
                        cell : bemCell,
                        exist : fs.existsSync(entityPath),
                        path : pathHack
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
                    if(file.exist) {
                        (techToFiles[file.cell.tech] || (techToFiles[file.cell.tech] = [])).push(file);
                        existsEntities[file.cell.entity.id] = true;

                        if(file.cell.entity.mod && !file.cell.entity.isSimpleMod()) {
                            // Add existence for `_mod` if `_mod_val` exists.
                            existsEntities[BemEntityName.create({
                                block : file.cell.entity.block,
                                elem : file.cell.entity.elem,
                                modName : file.cell.entity.modName
                            }).id] = true;
                        }
                    } else {
                        existsEntities[file.cell.entity.id] ||
                            (existsEntities[file.cell.entity.id]  = false);
                        (errEntities[file.cell.entity.id] ||
                            (errEntities[file.cell.entity.id] = [])).push(file);
                    }
                });

                Object.keys(existsEntities).forEach(fileId => {
                    // check if entity has no tech to resolve
                    if(!existsEntities[fileId]) {
                        errEntities[fileId].forEach(file => {
                            console.warn(`${logSymbols.warning} BEM-Module not found: ${file.path}`);
                        });
                    }
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
