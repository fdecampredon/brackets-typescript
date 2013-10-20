'use strict';

//--------------------------------------------------------------------------
//
//  Main entry point of the extension
//
//--------------------------------------------------------------------------
        

import typeScriptModeFactory = require('./mode');

/**
 * The init function is the main entry point of the extention
 * It is responsible for bootstraping, and injecting depency of the
 * main components in the application.
 */
function init() {
	
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

