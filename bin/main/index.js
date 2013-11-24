define(["require", "exports", './mode', './fileSystem', './workingSet', './project', './codeHint', './errorReporter', './quickEdit', './commentsHelper', './utils/signal', './logger'], function(require, exports, __typeScriptModeFactory__, __fs__, __ws__, __project__, __codeHint__, __errorReporter__, __qe__, __commentsHelper__, __signal__, __logger__) {
    'use strict';

    var typeScriptModeFactory = __typeScriptModeFactory__;
    var fs = __fs__;
    var ws = __ws__;
    var project = __project__;
    var codeHint = __codeHint__;
    var errorReporter = __errorReporter__;
    var qe = __qe__;
    var commentsHelper = __commentsHelper__;
    var signal = __signal__;
    var logger = __logger__;

    var LanguageManager = brackets.getModule('language/LanguageManager'), FileSystem = brackets.getModule('filesystem/FileSystem'), DocumentManager = brackets.getModule('document/DocumentManager'), ProjectManager = brackets.getModule('project/ProjectManager'), CodeHintManager = brackets.getModule('editor/CodeHintManager'), CodeInspection = brackets.getModule('language/CodeInspection'), EditorManager = brackets.getModule('editor/EditorManager');

    function init(conf) {
        logger.setLogLevel(conf.logLevel);

        CodeMirror.defineMode('typescript', typeScriptModeFactory);

        LanguageManager.defineLanguage('typescript', {
            name: 'TypeScript',
            mode: 'typescript',
            fileExtensions: ['ts'],
            blockComment: ['/*', '*/'],
            lineComment: ['//']
        });

        var fileSystemService = new fs.FileSystem(FileSystem, ProjectManager), workingSet = new ws.WorkingSet(DocumentManager);

        var projectManager = new project.TypeScriptProjectManager(fileSystemService, workingSet, project.typeScriptProjectFactory), codeHintProvider = new codeHint.TypeScriptCodeHintProvider(projectManager), lintingProvider = new errorReporter.TypeScriptErrorReporter(projectManager, CodeInspection.Type), quickEditProvider = new qe.TypeScriptQuickEditProvider(projectManager);

        projectManager.init();

        CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);

        CodeInspection.register('typescript', lintingProvider);

        EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);

        commentsHelper.init(new signal.DomSignalWrapper($("#editor-holder")[0], "keydown", true));
    }

    
    return init;
});
