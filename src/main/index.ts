'use strict';

import typeScriptModeFactory = require('./mode');

function init(debug) {
	
    //Register the typescript mode
    CodeMirror.defineMode('typescript', typeScriptModeFactory);
	
    //Register the language extension
	var LanguageManager = brackets.getModule('language/LanguageManager');
  	LanguageManager.defineLanguage('typescript', {
	    name: 'TypeScript',
	    mode: 'typescript',
	    fileExtensions: ['ts'],
	    blockComment: ['/*', '*/'],
	    lineComment: ['//']
	});

}

export = init;

