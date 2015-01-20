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

import FileSystem = require('./fileSystem');
import WorkingSet = require('./workingSet');
import TypeScriptPreferencesManager = require('./preferencesManager');
import WorkerBridge = require('./workerBridge');
import TypeScriptErrorReporter = require('./errorReporter');
import TypeScriptConfigErrorReporter = require('./configErrorReporter');
import TypeScriptQuickEditProvider = require('./quickEdit');
import TypeScriptQuickJumpProvider = require('./quickJump');
//import TypeScriptQuickFindDefitionProvider = require('./quickFindDefinition');
import CodeHintProvider = require('./codeHintProvider');
//import FormattingManager = require('./formattingManager');
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
    PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
    CommandManager = brackets.getModule('command/CommandManager'),
    CodeMirror: typeof CodeMirror = brackets.getModule('thirdparty/CodeMirror2/lib/codemirror'),
    Menus = brackets.getModule('command/Menus');

var tsErrorReporter: TypeScriptErrorReporter,
    quickEditProvider: TypeScriptQuickEditProvider,
    codeHintProvider: CodeHintProvider,
    quickJumpProvider: TypeScriptQuickJumpProvider
//    ,
//    quickFindDefinitionProvider: TypeScriptQuickFindDefitionProvider,
//    formattingManager: FormattingManager;
//    
    
 
var fileSystem: FileSystem,
    workingSet: WorkingSet,
    worker: Worker,
    preferencesManager: TypeScriptPreferencesManager,
    bridge: WorkerBridge;

function init(config: { logLevel: string; typeScriptLocation: string; workerLocation: string; }) {
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
    EditorManager.registerJumpToDefProvider(quickJumpProvider.handleJumpToDefinition);
    
      
    //Register error provider
    tsErrorReporter = new TypeScriptErrorReporter();
    CodeInspection.register('typescript', tsErrorReporter); 
    CodeInspection.register('json', new TypeScriptConfigErrorReporter());
    
    //Register quickFindDefinitionProvider
//    quickFindDefinitionProvider = new TypeScriptQuickFindDefitionProvider();
//    QuickOpen.addQuickOpenPlugin(quickFindDefinitionProvider);
    
    //Register formatting command
//    formattingManager = new FormattingManager();
//    CommandManager.register(FormattingManager.FORMAT_LABEL, FormattingManager.FORMAT_COMMAND_ID, formattingManager.format);
//    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
//    contextMenu.addMenuItem(FormattingManager.FORMAT_COMMAND_ID);
//    
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
    
//    formattingManager.reset();
    tsErrorReporter.reset();
    codeHintProvider.reset();
    quickEditProvider.reset();
    quickJumpProvider.reset();
//    quickFindDefinitionProvider.reset();
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
        }
    }).then(tsProjectService => {
        tsErrorReporter.setService(tsProjectService);
        codeHintProvider.setService(tsProjectService);
        quickEditProvider.setService(tsProjectService);
        quickJumpProvider.setService(tsProjectService);
//        quickFindDefinitionProvider.setService(proxy.lexicalStructureService);
//        formattingManager.setService(proxy.formattingService);
    });
}

export = init;
