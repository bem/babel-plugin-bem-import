
/**
 * @param {BemFile[]} files
 * @returns {String}
 */
module.exports = function generateJsStr(files) {
    return files
        .reduce((acc, file, i) => acc.concat(
            i !== files.length - 1
                ? `require('${file.path}'),`
                : `(require('${file.path}').default || require('${file.path}')).applyDecls()`
        ), ['('])
        .concat(')')
        .join('\n');
};

module.exports.es = function(files, specifierName, uid) {
    return files.reduce((acc, file, ix, files) => {
        if (specifierName && ix === files.length - 1) {
            const uniq = uid(file.cell.entity.id);
            acc += `import ${uniq} from "${file.path}";\n`;
            acc += `const ${specifierName} = ${uniq}.applyDecls();\n`;
        } else {
            acc += `import "${file.path}";\n`;
        }
        return acc;
    }, '');
};
