//   Copyright 2013-2014 François de Campredon
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
import TypeScriptPreferencesManager = require('./preferencesManager');
import WorkerBridge = require('../commons/workerBridge');
import TypeScriptErrorReporter = require('./errorReporter');
import TypeScriptConfigErrorReporter = require('./configErrorReporter')
import TypeScriptQuickEditProvider = require('./quickEdit');
import TypeScriptQuickJumpProvider = require('./quickJump');
import TypeScriptQuickFindDefitionProvider = require('./quickFindDefinition');
import CodeHintProvider = require('./codeHintProvider');
import typeScriptModeFactory = require('./mode');



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
    EditorManager = brackets.getModule('editor/EditorManager'),
    QuickOpen = brackets.getModule('search/QuickOpen'),
    PreferencesManager = brackets.getModule('preferences/PreferencesManager');

var tsErrorReporter : TypeScriptErrorReporter,
    quickEditProvider: TypeScriptQuickEditProvider,
    codeHintProvider : CodeHintProvider,
    quickJumpProvider: TypeScriptQuickJumpProvider,
    quickFindDefinitionProvider: TypeScriptQuickFindDefitionProvider;
    
    
 
var fileSystem: FileSystem,
    workingSet: WorkingSet,
    worker: Worker,
    preferencesManager: TypeScriptPreferencesManager,
    bridge: WorkerBridge;

function init(config: { logLevel: string; typeScriptLocation: string; workerLocation: string;}) {
    logger.setLogLevel(config.logLevel);
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
    codeHintProvider = new CodeHintProvider();
    CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);
    
    // Register quickEdit
    quickEditProvider = new TypeScriptQuickEditProvider();
    EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);   
    
    //Register quickJump
    quickJumpProvider = new TypeScriptQuickJumpProvider();
    EditorManager.registerJumpToDefProvider(quickJumpProvider.handleJumpToDefinition)
    
      
    //Register error provider
    tsErrorReporter = new TypeScriptErrorReporter();
    CodeInspection.register('typescript', tsErrorReporter); 
    CodeInspection.register('json', new TypeScriptConfigErrorReporter());
    
    //Register quickFindDefinitionProvider
    quickFindDefinitionProvider = new TypeScriptQuickFindDefitionProvider();
    QuickOpen.addQuickOpenPlugin(quickFindDefinitionProvider);

    
    initServices(config.workerLocation, config.typeScriptLocation, config.logLevel);
    
    $(ProjectManager).on('beforeProjectClose beforeAppClose', disposeServices);
    $(ProjectManager).on('projectOpen', () => initServices(config.workerLocation, config.typeScriptLocation, config.logLevel));
}


function disposeServices() {
    bridge.dispose();
    worker.terminate();
    fileSystem.dispose();
    workingSet.dispose();
    preferencesManager.dispose();
    
    tsErrorReporter.reset();
    codeHintProvider.reset();
    quickEditProvider.reset();
    quickJumpProvider.reset();
    quickFindDefinitionProvider.reset();
}


function initServices(workerLocation: string, typeScriptLocation: string, logLevel: string) {
    fileSystem = new FileSystem(BracketsFileSystem, ProjectManager);
    workingSet = new WorkingSet(DocumentManager, EditorManager);
    worker = new Worker(workerLocation);
    bridge = new WorkerBridge(worker);
    preferencesManager = new TypeScriptPreferencesManager(PreferencesManager);
    
    bridge.init({
        console: console,
        workingSet: workingSet,
        fileSystem: fileSystem,
        preferencesManager: preferencesManager,
        getTypeScriptLocation: function () {
            return typeScriptLocation;
        },
        getLogLevel: function () {
            return logLevel;
        }
    }).then(proxy => {
        tsErrorReporter.setService(proxy.errorService);
        codeHintProvider.setService(proxy.completionService);
        quickEditProvider.setService(proxy.definitionService);
        quickJumpProvider.setService(proxy.definitionService);
        quickFindDefinitionProvider.setService(proxy.lexicalStructureService);
    });
}

export = init;
