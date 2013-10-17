define(["require", "exports", './logger'], function(require, exports, __Logger__) {
    'use strict';

    var Logger = __Logger__;

    var Token = (function () {
        function Token() {
        }
        return Token;
    })();

    var LineDescriptor = (function () {
        function LineDescriptor() {
            this.eolState = Services.EndOfLineState.Start;
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
            if (lineDescriptor.eolState !== Services.EndOfLineState.Start) {
                return CodeMirror.Pass;
            }
            var text = lineDescriptor.text + "\n" + (textAfter || "fakeIdent"), position = textAfter ? text.length : text.length - 9, syntaxTree = this.getSyntaxTree(text), options = new FormattingOptions(!this.options.indentWithTabs, this.options.tabSize, this.options.indentUnit, '\n'), textSnapshot = new TypeScript.Formatting.TextSnapshot(TypeScript.SimpleText.fromString(text)), indent = TypeScript.Formatting.SingleTokenIndenter.getIndentationAmount(position, syntaxTree.sourceUnit(), textSnapshot, options);

            if (indent === null) {
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
            return TypeScript.Parser.parse("script", TypeScript.SimpleText.fromString(text), false, new TypeScript.ParseOptions(TypeScript.LanguageVersion.EcmaScript5, true));
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
            case TokenClass.NumberLiteral:
                return "number";
            case TokenClass.StringLiteral:
                return "string";
            case TokenClass.RegExpLiteral:
                return "string-2";
            case TokenClass.Operator:
                return "operator";
            case TokenClass.Comment:
                return "comment";
            case TokenClass.Keyword:
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

            case TokenClass.Identifier:
                return "variable";
            case TokenClass.Punctuation:
                return "bracket";
            case TokenClass.Whitespace:
            default:
                return null;
        }
    }

    function typeScriptModeFactory(options, spec) {
        return new TypeScriptMode(options);
    }

    
    return typeScriptModeFactory;
});
