import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;;

export interface DefinitionInfo {
    path: string;
    name: string;
    lineStart : number;
    lineEnd : number;
}

export interface DefinitionService {
    
    getDefinitionForFile(fileName: string, position: CodeMirror.Position): Promise<DefinitionInfo[]>;
}