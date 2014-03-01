import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;

/**
 * enum representing the different kind of hint
 */
export enum CompletionKind {
    DEFAULT,
    CLASS,
    INTERFACE,
    ENUM,
    MODULE,
    VARIABLE,
    METHOD,
    FUNCTION,
    KEYWORD
}

/**
 * interface representing a hint
 */
export interface CompletionEntry {
    name: string;
    type: string;
    kind: CompletionKind;
    doc: string;
}


export interface CompletionResult {
    match: string;
    entries: CompletionEntry[]
}

export interface CompletionService {
    getCompletionAtPosition(fileName: string, position: CodeMirror.Position): Promise<CompletionResult>;
}
