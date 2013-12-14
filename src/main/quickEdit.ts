import project = require('project');

var DocumentManager = brackets.getModule('document/DocumentManager'),
    MultiRangeInlineEditor = brackets.getModule('editor/MultiRangeInlineEditor').MultiRangeInlineEditor;

export class TypeScriptQuickEditProvider {
    private projectManager: project.TypeScriptProjectManager;
    
    init(projectManager: project.TypeScriptProjectManager) {
        this.projectManager = projectManager;    
    }
    
    
    typeScriptInlineEditorProvider = (hostEditor: brackets.Editor, pos: CodeMirror.Position): JQueryPromise<brackets.InlineWidget> => {
        
        if (hostEditor.getModeForSelection() !== 'typescript') {
            return null;
        }
        
        var sel = hostEditor.getSelection(false);
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
        var currentPath = hostEditor.document.file.fullPath,
            project = this.projectManager.getProjectForFile(currentPath);
        if (!project) {
            return null;
        }
        var languageService = project.getLanguageService();
        if (!languageService) {
            return null;
        }
        var position = project.getIndexFromPos(currentPath, pos),
            definitions = languageService.getDefinitionAtPosition(currentPath, position);
        if (!definitions || definitions.length === 0) {
            return null;
        }
        
        var inlineEditorRanges  = definitions.map(definition => {
            var startPos = project.indexToPosition(definition.fileName, definition.minChar),
                endPos = project.indexToPosition(definition.fileName, definition.limChar);
            return {
                path: definition.fileName,
                name: (definition.containerName ? (definition.containerName + '.') : '') + definition.name,
                lineStart : startPos.line,
                lineEnd : endPos.line
            }
        });
        inlineEditorRanges.filter(range => range.path !== currentPath || range.lineStart !== pos.line)
        if (inlineEditorRanges.length === 0) {
            return null;
        }
        
        var deferred = $.Deferred<brackets.InlineWidget>(),
            promises: JQueryPromise<any>[] = [],
            ranges: brackets.MultiRangeInlineEditorRange[] = [];
        
        inlineEditorRanges.forEach(range => {
            promises.push(DocumentManager.getDocumentForPath(range.path).then(doc => {
                ranges.push({
                    document : doc,
                    name: range.name,
                    lineStart: range.lineStart,  
                    lineEnd: range.lineEnd
                })    
            }));
        })
        
        $.when.apply($,promises).then(()=> {
            var inlineEditor = new MultiRangeInlineEditor(ranges);
            inlineEditor.load(hostEditor);
            deferred.resolve(inlineEditor);
        },() => deferred.reject());
        
        
        return deferred.promise();
    }
}