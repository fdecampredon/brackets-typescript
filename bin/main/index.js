define(["require", "exports", './mode'], function(require, exports, __typeScriptModeFactory__) {
    'use strict';

    var typeScriptModeFactory = __typeScriptModeFactory__;

    function init() {
        CodeMirror.defineMode('typescript', typeScriptModeFactory);

        var LanguageManager = brackets.getModule('language/LanguageManager');
        LanguageManager.defineLanguage('typescript', {
            name: 'TypeScript',
            mode: 'typescript',
            fileExtensions: ['ts'],
            blockComment: ['/*', '*/'],
            lineComment: ['//']
        });
    }

    
    return init;
});
