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

### License MIT
