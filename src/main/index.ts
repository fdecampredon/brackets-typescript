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



var fileSystem : fs.IFileSystem,
    workingSet: ws.IWorkingSet,
    projectManager : project.TypeScriptProjectManager,
    hintService : codeHint.HintService,
    tsErrorReporter : TypeScriptErrorReporter,
    quickEditProvider : qe.TypeScriptQuickEditProvider;
    
/**
 * The init function is the main entry point of the extention
 * It is responsible for bootstraping, and injecting depency of the
 * main components in the application.
 */
function init(conf: { isDebug: boolean; logLevel: string; }) {
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
    
    
    // Register code hint
    hintService = new codeHint.HintService();
    CodeHintManager.registerHintProvider(new codeHint.TypeScriptCodeHintProvider(hintService), ['typescript'], 0);
    
    
    // Register quickEdit
    quickEditProvider = new qe.TypeScriptQuickEditProvider();
    EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);    
    
      
    //Register error provider
    tsErrorReporter = new TypeScriptErrorReporter(CodeInspection.Type);
    CodeInspection.register('typescript', tsErrorReporter); 

    //Register comments helper
    commentsHelper.init(new signal.DomSignalWrapper<KeyboardEvent>($("#editor-holder")[0], "keydown", true));
    
    initServices();
    
    $(ProjectManager).on('beforeProjectClose beforeAppClose', disposeServices);
    $(ProjectManager).on('projectOpen', initServices);
}

function disposeServices() {
    fileSystem.dispose();
    workingSet.dispose();
    projectManager.dispose();
}


function initServices() {
    
    //Create warpers
    fileSystem = new fs.FileSystem(FileSystem, ProjectManager);
    workingSet = new ws.WorkingSet(DocumentManager, EditorManager);
    
    // project manager
    projectManager = new project.TypeScriptProjectManager(fileSystem, workingSet);  
    projectManager.init();
    
    //services initialization
    hintService.init(projectManager);
    quickEditProvider.init(projectManager);
    tsErrorReporter.init(projectManager);
}

export = init;

