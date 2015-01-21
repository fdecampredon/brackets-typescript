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

// TODO If we could not depends of TypeScript here, or at least extract just the part we are interested in
// We could avoid bundling the entire TypeScript Service with use
// see : https://github.com/fdecampredon/brackets-typescript/issues/13


declare var require: any;
import ts = require('typescript');
import indenter = require('./smartIndenter');



interface Token {
	string: string;
	classification: ts.TokenClass;
	length: number;
	position: number;
}


interface LineDescriptor {
    tokenMap: { [position: number]: Token };
    eolState: ts.EndOfLineState;
    text: string;
}

function createLineDescriptor() {
    return {
        tokenMap: {},
        eolState: ts.EndOfLineState.Start,
        text: ''
    }
}

function cloneLineDescriptor(lineDescriptor: LineDescriptor): LineDescriptor {
    return {
        tokenMap: lineDescriptor.tokenMap,
        eolState: lineDescriptor.eolState,
        text: lineDescriptor.text
    }
}




var classifier: ts.Classifier = ts.createClassifier({
    log: () => void 0
});

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

function initializeLineDescriptor(lineDescriptor: LineDescriptor, text: string) {
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
function setParent(parent: ts.Node) {
    parent.getChildren().forEach(node => {
        if (!node.parent) {
            node.parent = parent;
        }
        setParent(node);
    })
}

function createTypeScriptMode(options: CodeMirror.EditorConfiguration, spec: any): CodeMirror.CodeMirrorMode<any> {
    return {
        lineComment: '//',
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        electricChars: ':{}[]()',
        
        startState() {
            return createLineDescriptor();
        },
        
        copyState(lineDescriptor: LineDescriptor) {
            return cloneLineDescriptor(lineDescriptor);
        },

        token(stream: CodeMirror.CodeMirrorStream, lineDescriptor: LineDescriptor) {
            if (stream.sol()) {
                initializeLineDescriptor(lineDescriptor, stream.string);
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
        },


        indent(lineDescriptor: LineDescriptor , textAfter: string): number {
            if (lineDescriptor.eolState !== ts.EndOfLineState.Start) {
                return CodeMirror.Pass;
            }
            var text = lineDescriptor.text + '\n' + (textAfter || 'fakeIndent');
            var position = textAfter ? text.length: text.length - 9;
            var sourceFile = ts.createSourceFile(Math.random()+ '.ts', text, ts.ScriptTarget.Latest, Math.random() + '');
            setParent(sourceFile);
            var indent = indenter.getIndentation(position, sourceFile,  {
                IndentSize: options.indentUnit,
                TabSize: options.tabSize,
                NewLineCharacter: '\n',
                ConvertTabsToSpaces: !options.indentWithTabs
            });

            if (indent === null) {
                return CodeMirror.Pass;
            }
            return indent;
        }
    }


}

export = createTypeScriptMode;
