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


Instalation :
-------------

To install this software please use the [brackets-registry](https://brackets-registry.aboutweb.com/) or, use the install from url features of brackets with this [link](TODO)

Using brackets-typescript:
-------------------------

To benefits from all brackets-typescript features create a file '.brackets-typescript' in any folder under your project root folder (included).
This config file has to be valid json, here are a complete list of config options :

`sources` `string[]`
An array of string describing in '[minimatch](https://github.com/isaacs/minimatch)' format the sources of your project - *mandatory*


`compileOnSave` `boolean`
if true compile on save - default `false`


`propagateEnumConstants` `boolean`
see `propagateEnumConstants` options of the typescript compiler - default `false`

`removeComments` `boolean`
see `removeComments` options of the typescript compiler - default `false`

`noLib` `boolean`
see `noLib` options of the typescript compiler - default `false`


`target` `(es5|es6)`
see `target` options of the typescript compiler - default `es3`

`module` `(es5|es6)`
see `module` options of the typescript compiler - default `none`

`outFile` `(es5|es6)`
see `out` options of the typescript compiler 

`outDir` `(es5|es6)`
see `outDir` options of the typescript compiler 

`mapSource` `(es5|es6)`
see `mapSource` options of the typescript compiler 

`sourceRoot` `(es5|es6)`
see `sourceRoot` options of the typescript compiler 

`declaration` `(es5|es6)`
see `declaration` options of the typescript compiler 

`useCaseSensitiveFileResolution` `(es5|es6)`
see `useCaseSensitiveFileResolution` options of the typescript compiler 

`noImplicitAny` `(es5|es6)`
see `noImplicitAny` options of the typescript compiler 

