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

            debugger;
            const node = p.node;

            if (
                node.callee.type === 'Identifier' &&
                node.callee.name === 'require' &&
                node.arguments[0] && node.arguments[0].value
            ) {
                const bemFiles = bemImport
                    .parse(node.arguments[0].value, path.basename(filename).split('.')[0])
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
                        // BemFile
                        return {
                            cell : bemCell,
                            exist : fs.existsSync(entityPath),
                            path : entityPath
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

                    Object.keys(techToFiles).forEach(tech => {
                        console.log('ext:', tech);
                        console.log('tech:', extToTech[tech]);
                        techToFiles[tech].forEach(file => {
                            console.log(file.cell.entity.id);
                        });
                    });
                    // Each tech has own generator
                    var value = Object.keys(techToFiles).map(tech =>
                        (generators[extToTech[tech] || tech] || generators['*'])(techToFiles[tech])
                    ).join('\n')

                    debugger;
                    console.log(value);
                    var tmpl = template(value);
                    p.replaceWith(tmpl());

                    // node.update(
                    //     // Each tech has own generator
                    //     Object.keys(techToFiles).map(tech =>
                    //         (generators[extToTech[tech] || tech] || generators['*'])(techToFiles[tech])
                    //     ).join('\n')
                    // );
        }
      }
    }
  };
}
