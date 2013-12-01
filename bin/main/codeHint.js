define(["require", "exports", './logger', './utils/immediate'], function(require, exports, __Logger__, __immediate__) {
    'use strict';

    
    var Logger = __Logger__;
    
    var immediate = __immediate__;
    var Services = TypeScript.Services;

    var logger = new Logger(), classifier = new Services.TypeScriptServicesFactory().createClassifier(logger), StringUtils = brackets.getModule("utils/StringUtils");

    function isFunctionElement(kind) {
        switch (kind) {
            case Services.ScriptElementKind.callSignatureElement:
            case Services.ScriptElementKind.constructorImplementationElement:
            case Services.ScriptElementKind.constructSignatureElement:
            case Services.ScriptElementKind.functionElement:
            case Services.ScriptElementKind.localFunctionElement:
            case Services.ScriptElementKind.memberFunctionElement:
                return true;
            default:
                return false;
        }
    }

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
                } else {
                    return false;
                }
            }
            this.editor = editor;
            return true;
        };

        TypeScriptCodeHintProvider.prototype.getHints = function (implicitChar) {
            var _this = this;
            var deferred = $.Deferred();

            immediate.setImmediate(function () {
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

                var currentFilePath = _this.editor.document.file.fullPath, project = _this.typescriptProjectManager.getProjectForFile(_this.editor.document.file.fullPath);

                if (!project) {
                    deferred.resolve({ hints: [] });
                    return;
                }

                var languageService = project.getLanguageService(), position = _this.editor.getCursorPos();

                if (!languageService) {
                    deferred.resolve({ hints: [] });
                    return;
                }

                var filePosition = project.getIndexFromPos(currentFilePath, position), completionInfo = languageService.getCompletionsAtPosition(currentFilePath, filePosition, true), entries = completionInfo && completionInfo.entries;

                if (!entries) {
                    deferred.resolve({ hints: [] });
                    return;
                }

                if (_this.lastUsedToken && entries) {
                    entries = entries.filter(function (entry) {
                        return entry.name && entry.name.toLowerCase().indexOf(_this.lastUsedToken.string.toLowerCase()) === 0;
                    });
                    if (entries.length === 1 && entries[0].name === _this.lastUsedToken.string) {
                        deferred.resolve({ hints: [] });
                        return;
                    }
                }
                entries = entries && entries.sort(function (entry1, entry2) {
                    var name1 = entry1 && entry1.name.toLowerCase(), name2 = entry2 && entry2.name.toLowerCase();
                    if (name1 < name2) {
                        return -1;
                    } else if (name1 > name2) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                var hints = entries && entries.map(function (entry) {
                    var entryInfo = languageService.getCompletionEntryDetails(currentFilePath, filePosition, entry.name), hint = _this.hintTextFromInfo(entryInfo), $hintObj = $('<span>'), delimiter = '', hintCssClass;

                    if (entry.kind === Services.ScriptElementKind.keyword) {
                        switch (entry.name) {
                            case 'number':
                            case 'void':
                            case 'bool':
                            case 'boolean':
                                hintCssClass = 'variable';
                                break;
                            case 'static':
                            case 'public':
                            case 'private':
                            case 'export':
                            case 'get':
                            case 'set':
                                hintCssClass = 'qualifier';

                            case 'class':
                            case 'function':
                            case 'module':
                            case 'var':
                                hintCssClass = 'def';
                                break;
                            default:
                                hintCssClass = 'keyword';
                                break;
                        }
                    } else {
                        hintCssClass = 'variable';
                    }

                    var $inner = $('<span>').addClass('cm-' + hintCssClass);
                    $hintObj = $hintObj.addClass('cm-s-default').append($inner);

                    if (_this.lastUsedToken) {
                        var match = StringUtils.htmlEscape(hint.slice(0, _this.lastUsedToken.string.length)), suffix = StringUtils.htmlEscape(hint.slice(_this.lastUsedToken.string.length));
                        $inner.append(delimiter).append($('<span>').append(match).css('font-weight', 'bold')).append(suffix + delimiter);
                    } else {
                        $inner.text(delimiter + hint + delimiter);
                    }
                    $hintObj.data('entry', entry);

                    return $hintObj;
                });

                deferred.resolve({
                    hints: hints || [],
                    selectInitial: !!implicitChar
                });
            });
            return deferred;
        };

        TypeScriptCodeHintProvider.prototype.insertHint = function (hint) {
            var entry = hint.data('entry'), text = entry.name, position = this.editor.getCursorPos(), startPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position
            }, endPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position + this.lastUsedToken.string.length
            };

            this.editor.document.replaceRange(text, startPos, endPos);
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

        TypeScriptCodeHintProvider.prototype.hintTextFromInfo = function (entryInfo) {
            if (!entryInfo) {
                return 'bla';
            }
            var text = entryInfo.name;
            if (isFunctionElement(entryInfo.kind)) {
                text += entryInfo.type || '';
            } else if (entryInfo.type && entryInfo.type !== entryInfo.name) {
                text += ' : ' + entryInfo.type;
            }
            return text;
        };
        return TypeScriptCodeHintProvider;
    })();
    exports.TypeScriptCodeHintProvider = TypeScriptCodeHintProvider;
});
