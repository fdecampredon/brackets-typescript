brackets-typescript
===================

This is a [brackets](http://brackets.io/) extensions to add support for typescript.

Current Features :
-----------------

* Code completions
* Quick Edit 
* Syntactic coloring and indentation
* Error reporting
* Project level configuration


Installation :
-------------

To install this software please use the [brackets-registry](https://brackets-registry.aboutweb.com/) or, use the install from url features of brackets with this [link](https://github.com/fdecampredon/brackets-typescript/releases/download/v0.1.0/brackets-typescript.zip)

Using brackets-typescript:
-------------------------

To benefits from all brackets-typescript features create a file '.brackets-typescript' in any folder under your project root folder (included).
This config file has to be valid json, here is a complete list of availabel options options :

* `sources` *(`string[]`)* , **mandatory**  : An array of string describing in '[minimatch](https://github.com/isaacs/minimatch)' format the sources of your project

* `compileOnSave` *(`boolean`, default `false`)*: if true compile the project files when a file is saved (not implemented yet)

* `propagateEnumConstants` *(`boolean`, default `false`)* : see `propagateEnumConstants` options of the typescript compiler

* `removeComments` *(`boolean`, default `false`)* : see `removeComments` options of the typescript compiler

* `noLib` *(`boolean`, default `false`)* : see `noLib` options of the typescript compiler

* `target` *(`("es3" | "es5")`, default `es3`)* : see `target` options of the typescript compiler

* `module` *(`("none" | "amd" | "commonjs")`, default `none`)* :  see `module` options of the typescript compiler

* `outFile` *(`string`)* : see `out` options of the typescript compiler 

* `outDir` *(`string`)* : see `outDir` options of the typescript compiler 

* `mapSource`*(`string`)* : see `mapSource` options of the typescript compiler 

* `sourceRoot` *(`string`)* :see `sourceRoot` options of the typescript compiler 

* `declaration` *(`boolean`, default `false`)* : see `declaration` options of the typescript compiler

* `useCaseSensitiveFileResolution` *(`boolean`, default `false`)* : see `useCaseSensitiveFileResolution` options of the typescript compiler

* `noImplicitAny` *(`boolean`, default `false`)* : see `noImplicitAny` options of the typescript compiler 

