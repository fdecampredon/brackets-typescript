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
import TypeScriptErrorReporter = require('./errorReporter');
import qe = require('./quickEdit');
import commentsHelper = require('./commentsHelper');
import signal = require('./utils/signal');
import logger = require('./logger');

// brackets dependency
var LanguageManager = brackets.getModule('language/LanguageManager'),
    FileSystem = brackets.getModule('filesystem/FileSystem'),
    DocumentManager = brackets.getModule('document/DocumentManager'), 
    ProjectManager = brackets.getModule('project/ProjectManager'),
    CodeHintManager = brackets.getModule('editor/CodeHintManager'),
    CodeInspection = brackets.getModule('language/CodeInspection'),
    EditorManager = brackets.getModule('editor/EditorManager');

/**
 * The init function is the main entry point of the extention
 * It is responsible for bootstraping, and injecting depency of the
 * main components in the application.
 */


function init(conf: {
        isDebug: boolean;
        logLevel: string;
    }) {
    logger.setLogLevel(conf.logLevel);
    
    //Register the typescript mode
    CodeMirror.defineMode('typescript', typeScriptModeFactory); 
	
    //Register the language extension
  	LanguageManager.defineLanguage('typescript', {
	    name: 'TypeScript',
	    mode: 'typescript',
	    fileExtensions: ['ts'],
	    blockComment: ['/*', '*/'],
	    lineComment: ['//']
	});
    
    //Create warpers
    var fileSystem = new fs.FileSystem(FileSystem, ProjectManager),
        workingSet = new ws.WorkingSet(DocumentManager);
    
    // create project manager, and different brackets services
    var projectManager = new project.TypeScriptProjectManager(fileSystem, workingSet),
        codeHintProvider = new codeHint.TypeScriptCodeHintProvider(projectManager),
        errorReporter = new TypeScriptErrorReporter(projectManager, CodeInspection.Type),
        quickEditProvider = new qe.TypeScriptQuickEditProvider(projectManager);
    
        
    // initialize
    projectManager.init();

    CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);
    
    CodeInspection.register('typescript', errorReporter); 
    
    EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);
   
    commentsHelper.init(new signal.DomSignalWrapper<KeyboardEvent>($("#editor-holder")[0], "keydown", true));

}

export = init;

