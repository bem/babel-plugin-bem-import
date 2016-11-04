const path = require('path');
const fs = require('fs');
const bn = require('bem-naming');

const defaultNaming = { elem : '-', elemDirPrefix: '', modDirPrefix: '_' };

module.exports = function({ types: t }) {
  let namingOptions;
  let bemNaming;
  let bemLevels;
  let bemTechs;
  let getEntityFiles;
  let context;

  return {
    visitor: {
      Program(_, { opts: { naming, levels, techs }, file: { opts: { filename } } }) {
        namingOptions = Object.assign({}, defaultNaming, naming);
        bemNaming = bn(namingOptions);
        bemLevels = levels;
        bemTechs = techs;

        const rootEntity = path.basename(filename).split('.')[0];

        context = bemNaming.parse(rootEntity);

        getEntityFiles = entity => {
            const prefixes = bemLevels.map(level => path.resolve(
                process.cwd(), // TODO: use proper relative resolving
                path.join(
                    level,
                    entity.block,
                    entity.elem? `${namingOptions.elemDirPrefix}${entity.elem}` : '',
                    entity.modName? `${namingOptions.modDirPrefix}${entity.modName}` : '',
                    bemNaming.stringify(entity))));

            return bemTechs.reduce((res, tech) =>
                res.concat(prefixes.map(prefix => `${prefix}.${tech}`)),
                []);
        };
      },
      ImportDeclaration(p) {
        if(p.node.source.value.match(/^(b|e|m)\:/)) {
          const localEntityName = p.node.specifiers[0] && p.node.specifiers[0].local.name;

          const importString = p.node.source.value;

          let requireIdx = null;

          const currentEntityRequires = parseEntityImport(importString, context).map(entity => {
            const possibleEntityFiles = getEntityFiles(entity);

            const requires = possibleEntityFiles.filter(fs.existsSync).map((entityFile, i) => {
              !entity.modName && isFileJsModule(entityFile) && (requireIdx = i);
              return t.callExpression(
                t.identifier('require'),
                [t.stringLiteral(entityFile)]
              );
            });

            return { entity, requires };
          });

          const requires = currentEntityRequires.reduce((res, entity) => {
            if(!entity.requires.length) {
              throw new Error(`No BEM entity: "${bemNaming.stringify(entity.entity)}"`);
            }

            return res.concat(entity.requires);
          }, []);

          const idx = requireIdx !== null;
          const requiresAst = t.arrayExpression(requires);
          const combinedAst = idx ? t.memberExpression(
            requiresAst,
            t.numericLiteral(requireIdx),
            true
          ) : requiresAst;

          const replace = idx ? t.conditionalExpression(
            t.memberExpression(
              combinedAst,
              t.identifier('default')
            ),
            t.callExpression(
              t.memberExpression(
                t.memberExpression(
                  combinedAst,
                  t.identifier('default')
                ),
                t.identifier('applyDecls')
              ),
              []
            ),
            t.callExpression(
              t.memberExpression(
                combinedAst,
                t.identifier('applyDecls')
              ),
              []
            )
          ) : combinedAst;

          p.replaceWith(
            localEntityName ? t.variableDeclaration(
              'const',
              [t.variableDeclarator(
                t.identifier(localEntityName),
                replace
              )]
            ) : replace
          );
        }
      }
    }
  };
}

function parseEntityImport(entityImport, ctx) {
    const res = [],
        main = {};

    entityImport.split(' ').forEach((importToken, i) => {
        const split = importToken.split(':'),
            type = split[0],
            tail = split[1];

        if(!i) {
            main.block = type === 'b'? tail : ctx.block;
            type === 'e' && (main.elem = tail);
        } else if(type === 'e') {
            main.elem = tail;
        }

        switch(type) {
            case 'b':
            case 'e':
                res.length || res.push(main);
            break;

            case 'm':
                const splitMod = tail.split('='),
                    modName = splitMod[0],
                    modVals = splitMod[1];

                if(modVals) {
                    modVals.split('|').forEach(modVal => {
                        res.push(Object.assign({}, main, { modName, modVal }));
                    });
                } else {
                    res.push(Object.assign({}, main, { modName }));
                }
            break;
        }
    });

    return res;
}

function isFileJsModule(file) { return path.extname(file) === '.js' };
