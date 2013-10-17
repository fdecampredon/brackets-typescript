
interface CodeMirrorStream {
	eol() : boolean;
	sol() : boolean;
	peek() : string;
	next() : string;
	eat(match: string) : string;
	eat(match: RegExp) : string;
	eat(match:(char: string) =>boolean) : string;
	eatWhile(match: string) : string;
	eatWhile(match: RegExp) : string;
	eatWhile(match:(char: string) =>boolean) : string;
	eatSpace() : boolean;
	skipToEnd();
	skipTo(ch: string) : boolean;
	match(pattern: string, consume?: boolean, caseFold?: boolean) : boolean;
	match(pattern: RegExp, consume?: boolean) : string[];
	backUp(n: number);
	column() : number;
	indentation() : number;
	current() : string;

	pos:number;
	string:string;
}

interface CodeMirrorMode<T> {
	token(stream:CodeMirrorStream, state:T)
	
	startState?:() => T;
	blankLine?:(state : T) => void;
	copyState?:(state) => T;
	
	indent?:(state: T, textAfter : string) => number

	lineComment? : string;
	blockCommentStart ? : string;
	blockCommentEnd ? : string;
	blockCommentLead ? : string;

	electricChars ? : string
	
}


interface CodeMirrorModeOptions  {

}

interface CodeMirrorModeFactory<T> {
	(options:CodeMirror.EditorConfiguration, spec):CodeMirrorMode<T>
}

declare module CodeMirror {
	function defineMode(id:string, modefactory:CodeMirrorModeFactory<any>);
	function defineMIME(mime:string, modeId:string);
}