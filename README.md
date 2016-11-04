# BEM import

BEM-entities auto resolver for custom import strings.

``` js
import Block from 'b:block';
import Block from 'b:block m:modName';
import Block from 'b:block m:modName=modVal1|modVal2';
import BlockElem from 'b:block e:elem';
import BlockElem from 'b:block e:elem m:modName';
import BlockElem from 'b:block e:elem m:modName=modVal1|modVal2';
```

## Install

> npm i -D babel-plugin-bem-import

## Usage

`.babelrc`

``` json
{
  "plugins": [
    ["bem-import", {
      "naming": {
        "elem": "__",
        "elemDirPrefix": "__",
        "modDirPrefix": "_"
      },
      "levels": [
        "./common.blocks",
        "./desktop.blocks"
      ],
      "techs": ["js", "css"]
    }]
  ]
}
```

## Options

- __naming__: [bem-naming](https://en.bem.info/toolbox/sdk/bem-naming) overrides
- __levels__<Array>: paths to components declarations
- __techs__<Array>: list of techs extensions for require in runtime

### License MIT
