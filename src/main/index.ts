'use strict';

//--------------------------------------------------------------------------
//
//  Main entry point of the extension
//
//--------------------------------------------------------------------------
        

import typeScriptModeFactory = require('./mode');
import fs = require('./fileSystem');
import ws = require('./workingSet');
import project = require('./project');
import codeHint = require('./codeHint');
import errorReporter = require('./errorReporter');

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
    
    var FileIndexManager = brackets.getModule('project/FileIndexManager'),
        DocumentManager = brackets.getModule('document/DocumentManager'), 
        ProjectManager = brackets.getModule('project/ProjectManager'),
        FileUtils = brackets.getModule('file/FileUtils'),
        CodeHintManager = brackets.getModule('editor/CodeHintManager'),
        CodeInspection = brackets.getModule('language/CodeInspection');
    
    
    var fileSystemService = new fs.FileSystemService(ProjectManager, DocumentManager, FileIndexManager, FileUtils),
        workingSet = new ws.WorkingSet(DocumentManager);
    
    var projectManager = new project.TypeScriptProjectManager(fileSystemService, workingSet, project.typeScriptProjectFactory),
        codeHintProvider = new codeHint.TypeScriptCodeHintProvider(projectManager),
        lintingProvider = new errorReporter.TypeScriptErrorReporter(projectManager, CodeInspection.Type); 
    
    projectManager.init();

    CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);
    
    CodeInspection.register('typescript', lintingProvider); 

}

export = init;

