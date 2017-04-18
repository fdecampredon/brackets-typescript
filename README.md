brackets-typescript
===================

A [Brackets](http://brackets.io/) extension that adds [TypeScript](http://www.typescriptlang.org/) support.

Features:
----------

* Code completions
* Quick Edit 
* Quick Jump
* Quick Find Definition
* Syntactic coloring and indentation
* Error reporting
* Project level configuration


Installation:
--------------

To install this software please use the [brackets-registry](https://brackets-registry.aboutweb.com/) or use the Brackets *install from url* feature with this [link](https://github.com/fdecampredon/brackets-typescript/releases/download/v0.2.0/brackets-typescript.zip).

> You can use this folder url with *install from url* however a debug version will be fetched.

Using brackets-typescript:
-------------------------

Brackets-typescript enable all the Brackets features for TypeScript, to see how to use those features read the [How To Use Brackets Guide](https://github.com/adobe/brackets/wiki/How-to-Use-Brackets).

Configuration:
--------------

While you can Edit any typescript file and enjoy all the brackets features, using project configuration allows to specify the compilation scope of your project and to customize typescript compiler options. 
To configure your project simply create a brackets configuration file (a file named `.brackets.json` at the  root of your project) and add a `typescript` section in the json, example :
```json 
{
    "typescript": {
        "target": "ES5",
        "module": "AMD",
        "noImplicitAny": true,
        "sources" : [
            "src/declarations/**/*.ts",
            "src/main/**/*.ts"
        ]
    }
}
```

### Supported Options:

* `sources` (`string[]`) , **mandatory**: An array of '[minimatch](https://github.com/isaacs/minimatch)' pattern strings describing the sources of your project.

* `noLib` (`boolean`, default `false`): Do not include the default `lib.d.ts` file within global declaration.

* `target` (`("es3" | "es5")`, default `es3`): Specify ECMAScript target version: 'ES3' (default), or 'ES5'.

* `module` (`("none" | "amd" | "commonjs")`, default `none`):  Specify the module system: 'commonjs' or 'amd'.

* `sourceRoot` (`string`) : Specifies the location where debugger should locate TypeScript files instead of source locations.
 
* `typescriptPath` (`string`) : Specifies the location of an alternative typescript compiler **bin** folder (the specified folder must contains a `typescriptServices.js` file and a `lib.d.ts` file). If the option is unspecified or if the given path is invalid, the default compiler bundled with this extention will be used.

* `projects`: Allows to define multiple projects into one same config file, any option can be overriden in a project subsection. example :


```json 
{
    "typescript": {
        "target": "ES5",
        "module": "AMD",
        "noImplicitAny": true,
        "projects" : {
            "project1": {
                "sources": [
                    "project1/src/**/*.ts"
                ]
            },
            "project2": {
                "sources": [
                    "project2/src/**/*.ts"
                ],
                "target": "es3"
            }
        }
    }
}
```

> If you provide a `projects` section, a `sources` section must be specified for each project instead of in the toplevel `typescript` section.


