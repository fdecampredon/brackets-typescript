//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.


'use strict';

import logger = require('../commons/logger');
import FileSystem = require('./fileSystem');
import WorkingSet = require('./workingSet');
import WorkerBridge = require('../commons/workerBridge');
import TypeScriptErrorReporter = require('./errorReporter');
import TypeScriptQuickEditProvider = require('./quickEdit')
import CodeHintProvider = require('./codeHintProvider');

//--------------------------------------------------------------------------
//
//  Main entry point of the extension
//
//--------------------------------------------------------------------------

// brackets dependency
var LanguageManager = brackets.getModule('language/LanguageManager'),
    BracketsFileSystem = brackets.getModule('filesystem/FileSystem'),
    DocumentManager = brackets.getModule('document/DocumentManager'), 
    ProjectManager = brackets.getModule('project/ProjectManager'),
    CodeHintManager = brackets.getModule('editor/CodeHintManager'),
    CodeInspection = brackets.getModule('language/CodeInspection'),
    EditorManager = brackets.getModule('editor/EditorManager');

var tsErrorReporter : TypeScriptErrorReporter,
    quickEditProvider: TypeScriptQuickEditProvider,
    codeHintProvider : CodeHintProvider;
    
    
 
var fileSystem: FileSystem,
    workingSet: WorkingSet,
    worker: Worker,
    bridge: WorkerBridge;

function init(config: { logLevel: string; typeScriptLocation: string; workerLocation: string;}) {
    logger.setLogLevel(config.logLevel);
    
     LanguageManager.defineLanguage('typescript', {
	    name: 'TypeScript',
	    mode: 'javascript',
	    fileExtensions: ['ts'],
	    blockComment: ['/*', '*/'],
	    lineComment: ['//']
	});
    
   
    
    // Register code hint
    codeHintProvider = new CodeHintProvider();
    CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);
    
    
    // Register quickEdit
    quickEditProvider = new TypeScriptQuickEditProvider();
    EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);    
    
      
    //Register error provider
    tsErrorReporter = new TypeScriptErrorReporter();
    CodeInspection.register('typescript', tsErrorReporter); 

    
    initServices(config.workerLocation, config.typeScriptLocation, config.logLevel);
    
    $(ProjectManager).on('beforeProjectClose beforeAppClose', disposeServices);
    $(ProjectManager).on('projectOpen', () => initServices(config.workerLocation, config.typeScriptLocation, config.logLevel));
}


function disposeServices() {
    bridge.dispose();
    worker.terminate();
    fileSystem.dispose();
    workingSet.dispose();
    
    tsErrorReporter.reset();
}


function initServices(workerLocation: string, typeScriptLocation: string, logLevel: string) {
    fileSystem = new FileSystem(BracketsFileSystem, ProjectManager);
    workingSet = new WorkingSet(DocumentManager, EditorManager);
    worker = new Worker(workerLocation);
    bridge = new WorkerBridge(worker);
    
    bridge.init({
        console: console,
        workingSet: workingSet,
        fileSystem: fileSystem,
        getTypeScriptLocation: function () {
            return typeScriptLocation;
        },
        getLogLevel: function () {
            return logLevel;
        }
    }).then(proxy => {
        tsErrorReporter.setErrorService(proxy.errorService);
        codeHintProvider.setCompletionService(proxy.completionService);
        quickEditProvider.setDefinitionService(proxy.definitionService);
    });
}

export = init;
