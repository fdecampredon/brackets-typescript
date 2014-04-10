import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;

export interface DefinitionInfo {
    path: string;
    name: string;
    lineStart : number;
    charStart: number;
    lineEnd : number;
    charEnd: number;
    fileName: string;
}

export interface DefinitionService {
    
    getDefinitionForFile(fileName: string, position: CodeMirror.Position): Promise<DefinitionInfo[]>;
}