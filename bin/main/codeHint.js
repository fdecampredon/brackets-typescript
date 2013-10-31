define(["require", "exports", './logger'], function(require, exports, __Logger__) {
    'use strict';

    
    var Logger = __Logger__;
    

    var logger = new Logger(), classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

    var TypeScriptCodeHintProvider = (function () {
        function TypeScriptCodeHintProvider(typescriptProjectManager) {
            this.typescriptProjectManager = typescriptProjectManager;
        }
        TypeScriptCodeHintProvider.prototype.hasHints = function (editor, implicitChar) {
            if (implicitChar) {
                var token = this.getCurrentToken(editor);
                if (token) {
                    var TokenClass = Services.TokenClass;
                    switch (token.classification) {
                        case TokenClass.NumberLiteral:
                        case TokenClass.StringLiteral:
                        case TokenClass.RegExpLiteral:
                        case TokenClass.Operator:
                        case TokenClass.Comment:
                        case TokenClass.Whitespace:
                            return false;
                            break;
                        case TokenClass.Punctuation:
                            if (token.string !== '.') {
                                return false;
                            }
                            break;
                        default:
                            if (token.string.length < 2) {
                                return false;
                            }
                            break;
                    }
                }
            }
            this.editor = editor;
            return true;
        };

        TypeScriptCodeHintProvider.prototype.getHints = function (implicitChar) {
            var _this = this;
            var deferred = $.Deferred();
            setTimeout(function () {
                if (deferred.state() === 'rejected') {
                    return;
                }
                _this.lastUsedToken = _this.getCurrentToken(_this.editor);
                if (_this.lastUsedToken) {
                    var TokenClass = Services.TokenClass;
                    switch (_this.lastUsedToken.classification) {
                        case TokenClass.NumberLiteral:
                        case TokenClass.StringLiteral:
                        case TokenClass.RegExpLiteral:
                        case TokenClass.Operator:
                        case TokenClass.Comment:
                        case TokenClass.Whitespace:
                        case TokenClass.Punctuation:
                            if (implicitChar && _this.lastUsedToken.string !== '.' || _this.lastUsedToken.classification !== TokenClass.Punctuation) {
                                deferred.resolve({ hints: [] });
                                return;
                            }
                            _this.lastUsedToken = null;
                        default:
                            break;
                    }
                }

                var hints = _this.getCompletionAtHintPosition();
                if (_this.lastUsedToken) {
                    var hasExactToken = false;
                    hints = hints.filter(function (hint) {
                        if (hint === _this.lastUsedToken.string) {
                            hasExactToken = true;
                        }
                        return hint && hint.toLowerCase().indexOf(_this.lastUsedToken.string.toLowerCase()) === 0;
                    });
                    if (hasExactToken) {
                        deferred.resolve({ hints: [] });
                        return;
                    }
                }
                deferred.resolve({
                    hints: hints,
                    selectInitial: !!implicitChar
                });
            }, 0);
            return deferred;
        };

        TypeScriptCodeHintProvider.prototype.insertHint = function (hint) {
            var position = this.editor.getCursorPos(), startPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position
            }, endPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position + this.lastUsedToken.string.length
            };

            this.editor.document.replaceRange(hint, startPos, endPos);
        };

        TypeScriptCodeHintProvider.prototype.getCurrentToken = function (editor) {
            var position = editor.getCursorPos(), lineStr = editor.document.getLine(position.line), classificationResult = classifier.getClassificationsForLine(lineStr, Services.EndOfLineState.Start), currentPos = 0, linePosition = position.ch - 1;

            for (var i = 0, l = classificationResult.entries.length; i < l; i++) {
                var entry = classificationResult.entries[i];
                if (linePosition >= currentPos && linePosition < (currentPos + entry.length)) {
                    return {
                        string: lineStr.substr(currentPos, entry.length),
                        classification: entry.classification,
                        position: currentPos
                    };
                }
                currentPos += entry.length;
            }
            return null;
        };

        TypeScriptCodeHintProvider.prototype.getCompletionAtHintPosition = function () {
            var currentFilePath = this.editor.document.file.fullPath, project = this.typescriptProjectManager.getProjectForFile(this.editor.document.file.fullPath);
            if (!project) {
                return null;
            }
            var languageService = project.getLanguageService(), languageServiceHost = project.getLanguageServiceHost(), position = this.editor.getCursorPos();

            if (!languageService || !languageService) {
                return null;
            }
            var index = languageServiceHost.lineColToPosition(currentFilePath, position.line, position.ch), completionInfo = languageService.getCompletionsAtPosition(currentFilePath, index, true);

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
