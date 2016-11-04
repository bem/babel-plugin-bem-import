# BEM import

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
