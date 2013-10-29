define(["require", "exports", './mode', './fileSystem', './workingSet', './project', './codeHint', './errorReporter'], function(require, exports, __typeScriptModeFactory__, __fs__, __ws__, __project__, __codeHint__, __errorReporter__) {
    'use strict';

    var typeScriptModeFactory = __typeScriptModeFactory__;
    var fs = __fs__;
    var ws = __ws__;
    var project = __project__;
    var codeHint = __codeHint__;
    var errorReporter = __errorReporter__;

    function init() {
        CodeMirror.defineMode('typescript', typeScriptModeFactory);

        var LanguageManager = brackets.getModule('language/LanguageManager');
        LanguageManager.defineLanguage('typescript', {
            name: 'TypeScript',
            mode: 'typescript',
            fileExtensions: ['ts'],
            blockComment: ['/*', '*/'],
            lineComment: ['//']
        });

        var FileIndexManager = brackets.getModule('project/FileIndexManager'), DocumentManager = brackets.getModule('document/DocumentManager'), ProjectManager = brackets.getModule('project/ProjectManager'), FileUtils = brackets.getModule('file/FileUtils'), CodeHintManager = brackets.getModule('editor/CodeHintManager'), CodeInspection = brackets.getModule('language/CodeInspection');

        var fileSystemService = new fs.FileSystemService(ProjectManager, DocumentManager, FileIndexManager, FileUtils), workingSet = new ws.WorkingSet(DocumentManager);

        var projectManager = new project.TypeScriptProjectManager(fileSystemService, workingSet, project.typeScriptProjectFactory), codeHintProvider = new codeHint.TypeScriptCodeHintProvider(projectManager), lintingProvider = new errorReporter.TypeScriptErrorReporter(projectManager, CodeInspection.Type);

        projectManager.init();

        CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);

        CodeInspection.register('typescript', lintingProvider);
    }

    
    return init;
});
