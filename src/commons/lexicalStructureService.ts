import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;

interface LexicalStructureService {
    getLexicalStructureForFile(fileName: string): Promise<LexicalStructureService.LexicalStructureItem[]>;
}

module LexicalStructureService {
    export interface LexicalStructureItem { 
        containerName:string; 
        name: string; position: 
        CodeMirror.Position; 
    }
}

export = LexicalStructureService;