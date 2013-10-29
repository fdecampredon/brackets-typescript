define(["require", "exports", './project', './logger'], function(require, exports, __project__, __Logger__) {
    var project = __project__;
    var Logger = __Logger__;
    

    var logger = new Logger(), classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

    var TypeScriptCodeHintProvider = (function () {
        function TypeScriptCodeHintProvider(typescriptProjectManager) {
            this.typescriptProjectManager = typescriptProjectManager;
        }
        TypeScriptCodeHintProvider.prototype.hasHints = function (editor, implicitChar) {
            this.setCurrentFilePath(editor.document.file.fullPath);
            this.lastUsedEditor = editor;
            this.hintPosition = editor.getCursorPos();
            if (this.project) {
                this.hints = this.getCompletionAtHintPosition();
                if (this.hints && this.hints.length > 0) {
                    if (implicitChar) {
                        var hints = this.getFilteredHints();
                        return hints && hints.length === 1 && this.token.length > 1;
                    } else {
                        return this.hints.length > 0;
                    }
                }
                ;
            }
            return false;
        };

        TypeScriptCodeHintProvider.prototype.getHints = function (implicitChar) {
            var hints = this.getFilteredHints();
            if (hints.length > 0) {
                return {
                    hints: hints,
                    selectInitial: !!implicitChar
                };
            }
            return null;
        };

        TypeScriptCodeHintProvider.prototype.insertHint = function (hint) {
            var startPos = !this.token ? this.hintPosition : {
                line: this.hintPosition.line,
                ch: this.token.position
            }, endPos = !this.token ? this.hintPosition : {
                line: this.hintPosition.line,
                ch: this.token.position + this.token.length
            };

            this.lastUsedEditor.document.replaceRange(hint, startPos, endPos);
        };

        TypeScriptCodeHintProvider.prototype.getFilteredHints = function () {
            var _this = this;
            var editorPos = this.lastUsedEditor.getCursorPos(), lineStr = this.lastUsedEditor.document.getLine(editorPos.line), classificationResult = classifier.getClassificationsForLine(lineStr, Services.EndOfLineState.Start), currentPos = 0, linePosition = editorPos.ch - 1;

            for (var i = 0, l = classificationResult.entries.length; i < l; i++) {
                var entry = classificationResult.entries[i];
                if (linePosition >= currentPos && linePosition < currentPos + entry.length) {
                    var TokenClass = Services.TokenClass;
                    switch (entry.classification) {
                        case TokenClass.NumberLiteral:
                        case TokenClass.StringLiteral:
                        case TokenClass.RegExpLiteral:
                        case TokenClass.Operator:
                        case TokenClass.Comment:
                        case TokenClass.Punctuation:
                        case TokenClass.Whitespace:
                            this.token = null;
                            break;
                        default:
                            this.token = {
                                string: lineStr.substr(currentPos, entry.length),
                                position: currentPos,
                                length: entry.length
                            };
                            break;
                    }
                }
                currentPos += entry.length;
            }
            var hints = this.hints.slice(0, this.hints.length);
            if (this.token) {
                hints = hints.filter(function (hint) {
                    return hint && hint.toLowerCase().indexOf(_this.token.string.toLowerCase()) === 0;
                });
            }
            return hints;
        };

        TypeScriptCodeHintProvider.prototype.setCurrentFilePath = function (path) {
            if (path !== this.currentFilePath || !project) {
                this.currentFilePath = path;
                this.project = this.typescriptProjectManager.getProjectForFile(path);
            }
        };

        TypeScriptCodeHintProvider.prototype.getCompletionAtHintPosition = function () {
            var languageService = this.project.getLanguageService(), languageServiceHost = this.project.getLanguageServiceHost();

            if (!languageService || !languageService) {
                return null;
            }
            var index = languageServiceHost.lineColToPosition(this.currentFilePath, this.hintPosition.line, this.hintPosition.ch), completionInfo = languageService.getCompletionsAtPosition(this.currentFilePath, index, true);

            if (completionInfo && completionInfo.entries && completionInfo.entries.length > 0) {
                return completionInfo.entries.map(function (entry) {
                    return entry.name;
                }).sort(function (a, b) {
                    a = a && a.toLowerCase();
                    b = b && b.toLowerCase();
                    if (a < b) {
                        return -1;
                    } else if (a > b) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        };
        return TypeScriptCodeHintProvider;
    })();
    exports.TypeScriptCodeHintProvider = TypeScriptCodeHintProvider;
});
