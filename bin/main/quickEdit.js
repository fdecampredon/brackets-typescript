define(["require", "exports", './utils/immediate'], function(require, exports, __immediate__) {
    
    var immediate = __immediate__;

    var DocumentManager = brackets.getModule('document/DocumentManager'), MultiRangeInlineEditor = brackets.getModule('editor/MultiRangeInlineEditor').MultiRangeInlineEditor;

    var TypeScriptQuickEditProvider = (function () {
        function TypeScriptQuickEditProvider(projectManager) {
            var _this = this;
            this.projectManager = projectManager;
            this.typeScriptInlineEditorProvider = function (hostEditor, pos) {
                if (hostEditor.getModeForSelection() !== 'typescript') {
                    return null;
                }

                var sel = hostEditor.getSelection(false);
                if (sel.start.line !== sel.end.line) {
                    return null;
                }

                var currentPath = hostEditor.document.file.fullPath, project = _this.projectManager.getProjectForFile(currentPath);
                if (!project) {
                    return null;
                }
                var languageService = project.getLanguageService();
                if (!languageService) {
                    return null;
                }
                var position = project.getIndexFromPos(currentPath, pos), definitions = languageService.getDefinitionAtPosition(currentPath, position);
                if (!definitions || definitions.length === 0) {
                    return null;
                }

                var inlineEditorRanges = definitions.map(function (definition) {
                    var startPos = project.indexToPosition(definition.fileName, definition.minChar), endPos = project.indexToPosition(definition.fileName, definition.limChar);
                    return {
                        path: definition.fileName,
                        name: (definition.containerName ? (definition.containerName + '.') : '') + definition.name,
                        lineStart: startPos.line,
                        lineEnd: endPos.line
                    };
                });
                inlineEditorRanges.filter(function (range) {
                    return range.path !== currentPath || range.lineStart !== pos.line;
                });
                if (inlineEditorRanges.length === 0) {
                    return null;
                }

                var deferred = $.Deferred(), promises = [], ranges = [];

                inlineEditorRanges.forEach(function (range) {
                    promises.push(DocumentManager.getDocumentForPath(range.path).then(function (doc) {
                        ranges.push({
                            document: doc,
                            name: range.name,
                            lineStart: range.lineStart,
                            lineEnd: range.lineEnd
                        });
                    }));
                });

                $.when.apply($, promises).then(function () {
                    var inlineEditor = new MultiRangeInlineEditor(ranges);
                    inlineEditor.load(hostEditor);
                    deferred.resolve(inlineEditor);
                }, function () {
                    return deferred.reject();
                });

                return deferred.promise();
            };
        }
        return TypeScriptQuickEditProvider;
    })();
    exports.TypeScriptQuickEditProvider = TypeScriptQuickEditProvider;
});
