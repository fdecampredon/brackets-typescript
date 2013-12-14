'use strict';
define(["require", "exports", './mode', './fileSystem', './workingSet', './project', './codeHint', './errorReporter', './quickEdit', './commentsHelper', './utils/signal', './logger'], function(require, exports, typeScriptModeFactory, fs, ws, project, codeHint, TypeScriptErrorReporter, qe, commentsHelper, signal, logger) {
    // brackets dependency
    var LanguageManager = brackets.getModule('language/LanguageManager'), FileSystem = brackets.getModule('filesystem/FileSystem'), DocumentManager = brackets.getModule('document/DocumentManager'), ProjectManager = brackets.getModule('project/ProjectManager'), CodeHintManager = brackets.getModule('editor/CodeHintManager'), CodeInspection = brackets.getModule('language/CodeInspection'), EditorManager = brackets.getModule('editor/EditorManager');

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

        //Create warpers
        var fileSystem = new fs.FileSystem(FileSystem, ProjectManager), workingSet = new ws.WorkingSet(DocumentManager, EditorManager);

        // project manager
        var projectManager = new project.TypeScriptProjectManager(fileSystem, workingSet);

        //projectManager.registerService(errors.ErrorServiceFactory);
        projectManager.init();

        // code hint
        var hintService = new codeHint.HintService(projectManager), codeHintProvider = new codeHint.TypeScriptCodeHintProvider(hintService);
        CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);

        //error provider
        var tsErrorReporter = new TypeScriptErrorReporter(projectManager, CodeInspection.Type);
        CodeInspection.register('typescript', tsErrorReporter);

        //quickEdit
        var quickEditProvider = new qe.TypeScriptQuickEditProvider(projectManager);
        EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);

        //comments helper
        commentsHelper.init(new signal.DomSignalWrapper($("#editor-holder")[0], "keydown", true));
    }

    
    return init;
});
