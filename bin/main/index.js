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
define(["require", "exports", './mode', './fileSystem', './workingSet', './project', './codeHint', './errorReporter', './quickEdit', './commentsHelper', './utils/signal', './logger'], function(require, exports, typeScriptModeFactory, fs, ws, project, codeHint, TypeScriptErrorReporter, qe, commentsHelper, signal, logger) {
    // brackets dependency
    var LanguageManager = brackets.getModule('language/LanguageManager'), FileSystem = brackets.getModule('filesystem/FileSystem'), DocumentManager = brackets.getModule('document/DocumentManager'), ProjectManager = brackets.getModule('project/ProjectManager'), CodeHintManager = brackets.getModule('editor/CodeHintManager'), CodeInspection = brackets.getModule('language/CodeInspection'), EditorManager = brackets.getModule('editor/EditorManager');

    var fileSystem, workingSet, projectManager, hintService, tsErrorReporter, quickEditProvider;

    /**
    * The init function is the main entry point of the extention
    * It is responsible for bootstraping, and injecting depency of the
    * main components in the application.
    */
    function init(conf) {
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
        commentsHelper.init(new signal.DomSignalWrapper($("#editor-holder")[0], "keydown", true));

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

    
    return init;
});
