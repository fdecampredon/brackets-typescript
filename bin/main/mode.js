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
define(["require", "exports", './logger'], function(require, exports, Logger) {
    var Services = TypeScript.Services;
    var Formatting = TypeScript.Services.Formatting;

    var Token = (function () {
        function Token() {
        }
        return Token;
    })();

    var LineDescriptor = (function () {
        function LineDescriptor() {
            this.eolState = 0 /* Start */;
            this.text = "";
        }
        LineDescriptor.prototype.clone = function () {
            var clone = new LineDescriptor();
            clone.tokenMap = this.tokenMap;
            clone.eolState = this.eolState;
            clone.text = this.text;
            return clone;
        };
        return LineDescriptor;
    })();

    var TypeScriptMode = (function () {
        function TypeScriptMode(options) {
            this.lineComment = "//";
            this.blockCommentStart = "/*";
            this.blockCommentEnd = "*/";
            this.electricChars = ":{}[]()";
            this.options = options;
        }
        TypeScriptMode.prototype.startState = function () {
            return new LineDescriptor();
        };

        TypeScriptMode.prototype.copyState = function (lineDescriptor) {
            return lineDescriptor.clone();
        };

        TypeScriptMode.prototype.token = function (stream, lineDescriptor) {
            if (stream.sol()) {
                this.initializeLineDescriptor(lineDescriptor, stream.string);
            }

            var token = lineDescriptor.tokenMap[stream.pos];
            if (token) {
                var textBefore = stream.string.substr(0, stream.pos);
                for (var i = 0; i < token.length; i++) {
                    stream.next();
                }
                return getStyleForToken(token, textBefore);
            } else {
                stream.skipToEnd();
            }

            return null;
        };

        TypeScriptMode.prototype.indent = function (lineDescriptor, textAfter) {
            if (lineDescriptor.eolState !== 0 /* Start */) {
                //strange bug preven CodeMirror.Pass
                return CodeMirror.Pass;
            }
            var text = lineDescriptor.text + "\n" + (textAfter || "fakeIdent"), position = textAfter ? text.length : text.length - 9, syntaxTree = this.getSyntaxTree(text), options = new FormattingOptions(!this.options.indentWithTabs, this.options.tabSize, this.options.indentUnit, '\n'), textSnapshot = new Formatting.TextSnapshot(TypeScript.SimpleText.fromString(text)), indent = Formatting.SingleTokenIndenter.getIndentationAmount(position, syntaxTree.sourceUnit(), textSnapshot, options);

            if (indent === null) {
                //strange bug preven CodeMirror.Pass
                return CodeMirror.Pass;
            }
            return indent;
        };

        TypeScriptMode.prototype.initializeLineDescriptor = function (lineDescriptor, text) {
            var classificationResult = getClassificationsForLine(text, lineDescriptor.eolState), tokens = classificationResult.tokens, prevLine = lineDescriptor.clone();

            if (lineDescriptor.text) {
                lineDescriptor.text += '\n';
            }
            lineDescriptor.text += text;
            lineDescriptor.eolState = classificationResult.eolState;
            lineDescriptor.tokenMap = {};

            for (var i = 0, l = tokens.length; i < l; i++) {
                lineDescriptor.tokenMap[tokens[i].position] = tokens[i];
            }
        };

        TypeScriptMode.prototype.getSyntaxTree = function (text) {
            return TypeScript.Parser.parse("script", TypeScript.SimpleText.fromString(text), false, new TypeScript.ParseOptions(1 /* EcmaScript5 */, true));
        };
        return TypeScriptMode;
    })();

    var classifier = new Services.TypeScriptServicesFactory().createClassifier(new Logger());

    function getClassificationsForLine(text, eolState) {
        var classificationResult = classifier.getClassificationsForLine(text, eolState), currentPosition = 0, tokens = [];

        for (var i = 0, l = classificationResult.entries.length; i < l; i++) {
            var entry = classificationResult.entries[i];
            var token = {
                string: text.substr(currentPosition, entry.length),
                length: entry.length,
                classification: entry.classification,
                position: currentPosition
            };
            tokens.push(token);
            currentPosition += entry.length;
        }

        return {
            tokens: tokens,
            eolState: classificationResult.finalLexState
        };
    }

    function getStyleForToken(token, textBefore) {
        var TokenClass = Services.TokenClass;
        switch (token.classification) {
            case 6 /* NumberLiteral */:
                return "number";
            case 7 /* StringLiteral */:
                return "string";
            case 8 /* RegExpLiteral */:
                return "string-2";
            case 2 /* Operator */:
                return "operator";
            case 3 /* Comment */:
                return "comment";
            case 1 /* Keyword */:
                switch (token.string) {
                    case 'string':
                    case 'number':
                    case 'void':
                    case 'bool':
                    case 'boolean':
                        return "variable";
                    case 'static':
                    case 'public':
                    case 'private':
                    case 'export':
                    case 'get':
                    case 'set':
                        return 'qualifier';
                    case 'class':
                    case 'function':
                    case 'module':
                    case 'var':
                        return 'def';
                    default:
                        return 'keyword';
                }

            case 5 /* Identifier */:
                return "variable";
            case 0 /* Punctuation */:
                return "bracket";
            case 4 /* Whitespace */:
            default:
                return null;
        }
    }

    function typeScriptModeFactory(options, spec) {
        return new TypeScriptMode(options);
    }

    
    return typeScriptModeFactory;
});
