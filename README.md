brackets-typescript
===================

This is a [brackets](http://brackets.io/) extensions to add support for typescript.

Features:
----------

* Code completions
* Quick Edit 
* Quick Jumb
* Quick Find Definition
* Syntactic coloring and indentation
* Error reporting
* Project level configuration


Installation:
--------------

To install this software please use the [brackets-registry](https://brackets-registry.aboutweb.com/) or, use the install from url features of brackets with this [link](https://github.com/fdecampredon/brackets-typescript/releases/download/v0.2.0/brackets-typescript.zip).

Using brackets-typescript:
-------------------------

Brackets-typescript enable all the Brackets features for TypeScript, to see how to use those features see the [How To Use Brackets Guide](https://github.com/adobe/brackets/wiki/How-to-Use-Brackets).

Configuration:
--------------

While you can Edit any typescript file and enjoy all the brackets features, using project configuration allows to specify the compilation scope of your project and to customize typescript compiler options. 
To configure your project simply create a brackets configuration file (a file named `.brackets.json` at the  root of your project) and add a `typescript` to your json, example :
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

###Supported Options:

* `sources` *(`string[]`)* , **mandatory**  : An array of '[minimatch](https://github.com/isaacs/minimatch)' string describing the sources of your project

* `noLib` *(`boolean`, default `false`)* : Do not include the default `lib.d.ts` within global declaration

* `target` *(`("es3" | "es5")`, default `es3`)* : Specify ECMAScript target version: 'ES3' (default), or 'ES5'

* `module` *(`("none" | "amd" | "commonjs")`, default `none`)* :  Specify module code generation: 'commonjs' or 'amd'

* `sourceRoot` *(`string`)* : Specifies the location where debugger should locate TypeScript files instead of source locations.


