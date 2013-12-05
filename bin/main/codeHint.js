define(["require", "exports", './logger', './utils/immediate'], function(require, exports, __Logger__, __immediate__) {
    'use strict';

    
    var Logger = __Logger__;
    
    var immediate = __immediate__;
    var Services = TypeScript.Services;
    var ScriptElementKind = Services.ScriptElementKind;
    var ScriptElementKindModifier = Services.ScriptElementKindModifier;

    (function (HintKind) {
        HintKind[HintKind["DEFAULT"] = 0] = "DEFAULT";
        HintKind[HintKind["CLASS"] = 1] = "CLASS";
        HintKind[HintKind["INTERFACE"] = 2] = "INTERFACE";
        HintKind[HintKind["ENUM"] = 3] = "ENUM";
        HintKind[HintKind["MODULE"] = 4] = "MODULE";
        HintKind[HintKind["VARIABLE"] = 5] = "VARIABLE";
        HintKind[HintKind["METHOD"] = 6] = "METHOD";
        HintKind[HintKind["FUNCTION"] = 7] = "FUNCTION";
        HintKind[HintKind["KEYWORD"] = 8] = "KEYWORD";
    })(exports.HintKind || (exports.HintKind = {}));
    var HintKind = exports.HintKind;

    var HintService = (function () {
        function HintService(typescriptProjectManager) {
            this.typescriptProjectManager = typescriptProjectManager;
        }
        HintService.prototype.getHintsAtPositon = function (path, position, currentToken) {
            var project = this.typescriptProjectManager.getProjectForFile(path);

            if (!project) {
                return null;
            }

            var languageService = project.getLanguageService();

            if (!languageService) {
                return null;
            }

            var index = project.getIndexFromPos(path, position), completionInfo = languageService.getCompletionsAtPosition(path, index, true), entries = completionInfo && completionInfo.entries;

            if (!entries) {
                return null;
            }

            if (currentToken) {
                entries = entries.filter(function (entry) {
                    return entry.name && entry.name.toLowerCase().indexOf(currentToken.toLowerCase()) === 0;
                });
            }

            entries.sort(function (entry1, entry2) {
                var name1 = entry1 && entry1.name.toLowerCase(), name2 = entry2 && entry2.name.toLowerCase();
                if (name1 < name2) {
                    return -1;
                } else if (name1 > name2) {
                    return 1;
                } else {
                    return 0;
                }
            });

            var hints = entries.map(function (entry) {
                var entryInfo = languageService.getCompletionEntryDetails(currentToken, index, entry.name), hint = {
                    name: entry.name,
                    kind: HintKind.DEFAULT,
                    type: entryInfo ? entryInfo.type : ''
                };

                switch (entry.kind) {
                    case ScriptElementKind.unknown:
                    case ScriptElementKind.primitiveType:
                    case ScriptElementKind.scriptElement:
                        break;
                    case ScriptElementKind.keyword:
                        hint.kind = HintKind.KEYWORD;
                        break;

                    case ScriptElementKind.classElement:
                        hint.kind = HintKind.CLASS;
                        break;
                    case ScriptElementKind.interfaceElement:
                        hint.kind = HintKind.INTERFACE;
                        break;
                    case ScriptElementKind.enumElement:
                        hint.kind = HintKind.ENUM;
                        break;
                    case ScriptElementKind.moduleElement:
                        hint.kind = HintKind.MODULE;
                        break;

                    case ScriptElementKind.memberVariableElement:
                    case ScriptElementKind.variableElement:
                    case ScriptElementKind.localVariableElement:
                    case ScriptElementKind.parameterElement:
                        hint.kind = HintKind.VARIABLE;
                        break;

                    case ScriptElementKind.memberFunctionElement:
                    case ScriptElementKind.functionElement:
                    case ScriptElementKind.localFunctionElement:
                        hint.kind = HintKind.FUNCTION;
                        break;

                    case ScriptElementKind.typeParameterElement:
                    case ScriptElementKind.constructorImplementationElement:
                    case ScriptElementKind.constructSignatureElement:
                    case ScriptElementKind.callSignatureElement:
                    case ScriptElementKind.indexSignatureElement:
                    case ScriptElementKind.memberGetAccessorElement:
                    case ScriptElementKind.memberSetAccessorElement:
                        console.log('untreated case ' + entry.kind);
                        break;
                }

                return hint;
            });

            return hints;
        };
        return HintService;
    })();
    exports.HintService = HintService;

    var logger = new Logger(), classifier = new Services.TypeScriptServicesFactory().createClassifier(logger), _ = brackets.getModule('thirdparty/lodash');

    var HINT_TEMPLATE = '<span class="cm-s-default">\
                            <span style="display: inline-block" class="{{class_type}}">\
                                <span style="font-weight: bold">{{match}}</span>\
                                <span>{{suffix}}</span>\
                            <span>\
                    </span>';

    var TypeScriptCodeHintProvider = (function () {
        function TypeScriptCodeHintProvider(hintService) {
            this.hintService = hintService;
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
                            }
                            _this.lastUsedToken = null;
                        default:
                            break;
                    }
                }

                var currentFilePath = _this.editor.document.file.fullPath, position = _this.editor.getCursorPos();

                var hints = _this.hintService.getHintsAtPositon(currentFilePath, position, _this.lastUsedToken && _this.lastUsedToken.string);

                if (!hints || hints.length === 0) {
                    deferred.resolve({ hints: [] });
                    return;
                }
                deferred.resolve({
                    hints: hints.map(_this.hintToJQuery, _this),
                    selectInitial: !!implicitChar
                });
            });
            return deferred;
        };

        TypeScriptCodeHintProvider.prototype.insertHint = function ($hintObj) {
            var hint = $hintObj.data('hint'), position = this.editor.getCursorPos(), startPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position
            }, endPos = !this.lastUsedToken ? position : {
                line: position.line,
                ch: this.lastUsedToken.position + this.lastUsedToken.string.length
            };

            this.editor.document.replaceRange(hint.name, startPos, endPos);
        };

        TypeScriptCodeHintProvider.prototype.hintToJQuery = function (hint) {
            var text = hint.name, match, suffix, class_type = '';
            switch (hint.kind) {
                case HintKind.KEYWORD:
                    switch (hint.name) {
                        case 'static':
                        case 'public':
                        case 'private':
                        case 'export':
                        case 'get':
                        case 'set':
                            class_type = 'cm-qualifier';
                            break;
                        case 'class':
                        case 'function':
                        case 'module':
                        case 'var':
                            class_type = 'cm-def';
                            break;
                        default:
                            class_type = 'cm-keyword';
                            break;
                    }
                    break;
                case HintKind.METHOD:
                case HintKind.FUNCTION:
                    text += hint.type ? hint.type : '';
                    break;
                default:
                    text += hint.type ? ' - ' + hint.type : '';
                    break;
            }

            if (this.lastUsedToken) {
                match = _.escape(text.slice(0, this.lastUsedToken.string.length));
                suffix = _.escape(text.slice(this.lastUsedToken.string.length));
            } else {
                match = '';
                suffix = text;
            }

            var result = $(Mustache.render(HINT_TEMPLATE, {
                classifier: classifier,
                match: match,
                suffix: suffix,
                class_type: class_type
            }));
            result.data('hint', hint);
            return result;
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
        return TypeScriptCodeHintProvider;
    })();
    exports.TypeScriptCodeHintProvider = TypeScriptCodeHintProvider;
});
