export interface DefinitionInfo {
    path: string;
    name: string;
    lineStart : number;
    lineEnd : number;
}

export interface DefinitionService {
    
    getDefinitionForFile(fileName: string, position: CodeMirror.Position): JQueryPromise<DefinitionInfo[]>;
}