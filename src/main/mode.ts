//   Copyright 2013-2014 François de Campredon
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

class FormattingOptions {
    constructor(public useTabs: boolean,
                public spacesPerTab: number,
                public indentSpaces: number,
                public newLineCharacter: string) {
    }

    public static defaultOptions = new FormattingOptions(
        /*useTabs:*/ false, 
        /*spacesPerTab:*/ 4, 
        /*indentSpaces:*/ 4, 
        /*newLineCharacter*/ '\r\n'
    );
}

import logger = require('../commons/logger');
import Formatting = TypeScript.Services.Formatting;

// exposing SourceFileObject.createSourceFileObject
var createSourceFileObject: (filename: string, scriptSnapshot: TypeScript.IScriptSnapshot, languageVersion: ts.ScriptTarget) => ts.SourceFile =
    (<any>ts.getNodeConstructor(ts.SyntaxKind.SourceFile).prototype.constructor).createSourceFileObject;

class Token {
    string: string;
    classification: ts.TokenClass;
    length: number;
    position: number;
}


class LineDescriptor {
    tokenMap: { [position: number]: Token };
    eolState: ts.EndOfLineState = ts.EndOfLineState.Start;
    text: string = '';

    clone(): LineDescriptor {
        var clone: LineDescriptor = new LineDescriptor();
        clone.tokenMap = this.tokenMap;
        clone.eolState = this.eolState;
        clone.text =  this.text;
        return clone;
    }
}



class TypeScriptMode implements CodeMirror.CodeMirrorMode<LineDescriptor> {
    private options: CodeMirror.EditorConfiguration;

    lineComment = '//';
    blockCommentStart = '/*';
    blockCommentEnd  = '*/';
    electricChars =  ':{}[]()';

    constructor(options: CodeMirror.EditorConfiguration) {
        this.options = options;
    }

    startState() {
        return new LineDescriptor();
    }

    copyState(lineDescriptor: LineDescriptor) {
        return lineDescriptor.clone();
    }
    
    token(stream: CodeMirror.CodeMirrorStream, lineDescriptor: LineDescriptor) {
        if (stream.sol()) {
            this.initializeLineDescriptor(lineDescriptor, stream.string);
        }

        var token = lineDescriptor.tokenMap[stream.pos];
        if (token) {
            var textBefore: string  = stream.string.substr(0, stream.pos);
            for (var i = 0; i < token.length; i++) {
                stream.next();
            }
            return getStyleForToken(token, textBefore);
        } else {
            stream.skipToEnd();
        }

        return null;
    }


    indent(lineDescriptor: LineDescriptor , textAfter: string): number {
        if (lineDescriptor.eolState !== ts.EndOfLineState.Start) {
            //strange bug preven CodeMirror.Pass
            return <number>(<any>CodeMirror).Pass;
        }
        var text = lineDescriptor.text + '\n' + (textAfter || 'fakeIdent'),
            position = textAfter ? text.length : text.length - 9,
            syntaxTree = this.getSyntaxTree(text),
            options = new FormattingOptions(!this.options.indentWithTabs, this.options.tabSize, this.options.indentUnit, '\n'),
            textSnapshot =  new Formatting.TextSnapshot(TypeScript.SimpleText.fromString(text)),
            indent = Formatting.SingleTokenIndenter.getIndentationAmount(
                position, 
                syntaxTree.sourceUnit(), 
                textSnapshot, 
                options
            );
        
        if (indent === null) {
            //strange bug preven CodeMirror.Pass
            return <number>(<any>CodeMirror).Pass;
        }
        return indent;
    }


    private initializeLineDescriptor(lineDescriptor: LineDescriptor, text: string) {
        var classificationResult = getClassificationsForLine(text, lineDescriptor.eolState),
            tokens = classificationResult.tokens;
        
        if (lineDescriptor.text) {
            lineDescriptor.text += '\n';
        }
        lineDescriptor.text += text;
        lineDescriptor.eolState = classificationResult.eolState;
        lineDescriptor.tokenMap = {};

        for (var i = 0, l = tokens.length; i < l; i++) {
            lineDescriptor.tokenMap[tokens[i].position] = tokens[i];
        }
        
       
    }
    
    private createSourceFile(text: string) {
        return createSourceFileObject(
            'script',
            TypeScript.ScriptSnapshot.fromString(text),
            ts.ScriptTarget.ES5
        );
    }

    private getSyntaxTree(text: string) {
        return this.createSourceFile(text).getSyntaxTree();
    }
}



var classifier: ts.Classifier = ts.createClassifier(new logger.LogingClass());

function getClassificationsForLine(text: string, eolState: ts.EndOfLineState ) {
    var classificationResult = classifier.getClassificationsForLine(text, eolState),
        currentPosition = 0,
        tokens: Token[]  = [];

    for (var i = 0, l = classificationResult.entries.length; i < l ; i++) {
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

function getStyleForToken(token: Token, textBefore: string): string {
    var TokenClass = ts.TokenClass;
    switch (token.classification) {
        case TokenClass.NumberLiteral:
            return 'number';
        case TokenClass.StringLiteral:
            return 'string';
        case TokenClass.RegExpLiteral:
            return 'string-2';
        case TokenClass.Operator: 
            return 'operator';
        case TokenClass.Comment:
            return 'comment';
        case TokenClass.Keyword: 
            switch (token.string) {
                case 'string':
                case 'number':
                case 'void':
                case 'bool':
                case 'boolean':
                    return 'variable-2';
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
            // Show types (indentifiers in PascalCase) as variable-2, other types (camelCase) as variable
            if (token.string.charAt(0).toLowerCase() !== token.string.charAt(0)) {
                return 'variable-2';
            } else {
                return 'variable';
            }
        case TokenClass.Punctuation: 
            return 'bracket';
        case TokenClass.Whitespace:
        default:
            return null;
    }
}

function typeScriptModeFactory(options: CodeMirror.EditorConfiguration, spec: any): CodeMirror.CodeMirrorMode<any> {
    return new TypeScriptMode(options);
}

export = typeScriptModeFactory;
