'use strict';

import Logger = require('./logger');

class Token {
	string:string;
	classification: Services.TokenClass;
	length:number;
	position:number;
}


class LineDescriptor {
	tokenMap:{ [position: number]:Token };
	eolState: Services.EndOfLineState = Services.EndOfLineState.Start;
    text: string = "";

	clone():LineDescriptor {
		var clone:LineDescriptor = new LineDescriptor();
		clone.tokenMap = this.tokenMap;
		clone.eolState = this.eolState;
		clone.text =  this.text;
		return clone;
	}
}



class TypeScriptMode implements CodeMirrorMode<LineDescriptor> {
	private options:CodeMirror.EditorConfiguration;

	lineComment = "//";
	blockCommentStart = "/*";
	blockCommentEnd  = "*/";
	electricChars =  ":{}[]()";

	constructor(options:CodeMirror.EditorConfiguration) {
		this.options = options;
	}

	startState() {
		return new LineDescriptor();
	}

	copyState(lineDescriptor: LineDescriptor) {
		return lineDescriptor.clone();
	}
    
	token(stream:CodeMirrorStream, lineDescriptor:LineDescriptor) {
		if(stream.sol()) {
			this.initializeLineDescriptor(lineDescriptor, stream.string);
		}

		var token = lineDescriptor.tokenMap[stream.pos];
		if(token) {
			var textBefore:string  = stream.string.substr(0, stream.pos);
			for(var i = 0; i < token.length; i++) {
				stream.next();
			}
			return getStyleForToken(token, textBefore);
		}
		else {
			stream.skipToEnd();
		}
	 
		return null;
	}


	indent(lineDescriptor:LineDescriptor , textAfter: string):number {
		if(lineDescriptor.eolState !== Services.EndOfLineState.Start) {
			return <number>CodeMirror.Pass;
		}
        var text = lineDescriptor.text + "\n" + (textAfter || "fakeIdent"),
            position = textAfter? text.length : text.length - 9,
            syntaxTree = this.getSyntaxTree(text),
            options = new FormattingOptions(!this.options.indentWithTabs, this.options.tabSize, this.options.indentUnit, '\n'),
            textSnapshot =  new TypeScript.Formatting.TextSnapshot(TypeScript.SimpleText.fromString(text)),
            indent = TypeScript.Formatting.SingleTokenIndenter.getIndentationAmount(
                position, 
                syntaxTree.sourceUnit(), 
                textSnapshot, 
                options
            );
        
        if(indent === null) {
            return <number>CodeMirror.Pass
        }
        return indent;
	}


	private initializeLineDescriptor(lineDescriptor: LineDescriptor, text: string) {
		var classificationResult = getClassificationsForLine(text, lineDescriptor.eolState),
			tokens = classificationResult.tokens,
            prevLine = lineDescriptor.clone();
        
        if (lineDescriptor.text) {
            lineDescriptor.text += '\n';
        }
        lineDescriptor.text += text;
        lineDescriptor.eolState = classificationResult.eolState;
		lineDescriptor.tokenMap = {};

		for (var i=0, l = tokens.length; i < l; i++) {
			lineDescriptor.tokenMap[tokens[i].position] = tokens[i];
		}
        
       
	}
    
    private getSyntaxTree(text: string) {
        return TypeScript.Parser.parse(
            "script", 
            TypeScript.SimpleText.fromString(text), 
            false, 
            new TypeScript.ParseOptions(TypeScript.LanguageVersion.EcmaScript5, true, true)
        );
    }
}



var classifier:Services.Classifier = new Services.TypeScriptServicesFactory().createClassifier(new Logger());

function getClassificationsForLine(text:string, eolState:Services.EndOfLineState ) {
	var classificationResult = classifier.getClassificationsForLine(text, eolState),
		currentPosition = 0,
		tokens:Token[]  = [];

	for (var i = 0, l = classificationResult.entries.length; i < l ; i++) {
		var entry = classificationResult.entries[i];
		var token = {
			string: text.substr(currentPosition, entry.length),
			length: entry.length,
			classification: entry.classification,
			position:currentPosition
		};
		tokens.push(token);
		currentPosition += entry.length;
	}

	return {
		tokens: tokens,
		eolState: classificationResult.finalLexState
	}
}

function getStyleForToken(token:Token, textBefore:string):string {
	var TokenClass = Services.TokenClass;
	switch(token.classification) {
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
			switch(token.string) {
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

function typeScriptModeFactory(options:CodeMirror.EditorConfiguration, spec):CodeMirrorMode<any> {
	return new TypeScriptMode(options);
}

export = typeScriptModeFactory;

