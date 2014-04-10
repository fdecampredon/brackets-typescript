import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;

interface LexicalStructureService {
    getLexicalStructureForFile(fileName: string): Promise<{ name: string; position: CodeMirror.Position; }[]>;
}

export = LexicalStructureService;