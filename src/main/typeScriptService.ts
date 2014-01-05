
import collections = require('../commons/collections');
import TypeScriptOperation = require('../commons/tsOperations');
import typeScriptUtils = require('./typeScriptUtils');

var uidHelper = Date.now() % 1e9;
    
var currentDeferred: JQueryDeferred<any>,
    operationsStack: { () : JQueryDeferred<any>; }[] = [],
    initialized = false;

function init() {
    if (!initialized) {
        typeScriptUtils.worker.onmessage = (event: MessageEvent) => {
            currentDeferred.resolve(event.data.result);
            currentDeferred = null;
            executeNextOperation();
        };
        typeScriptUtils.worker.onerror = (error: ErrorEvent) => {
            currentDeferred.reject(error);
            currentDeferred = null;
            executeNextOperation();
        };
        initialized = true;
    }
}

function executeOperations(operation: TypeScriptOperation, uid: string,  ...rest: any[]): JQueryPromise<any> {
    var deferred = $.Deferred();
    operationsStack.push(() => {
        typeScriptUtils.worker.postMessage({
            uid: uid,
            operation : operation,
            args: rest
        }); 
        return deferred;
    })
    executeNextOperation();
    return deferred.promise();
}

function executeNextOperation() {
    if (!currentDeferred && operationsStack.length > 0) {
        currentDeferred = operationsStack.shift()();
    }
}



class TypeScriptService {
    
    private uid: string;
    
    private sequence: JQueryPromise<any> = $.Deferred((deferred) => deferred.resolve());
    
    constructor() {
        this.uid = '__sevice' + (Math.random() * 1e9 >>> 0) + (uidHelper++ + '__');
        init();
    }
      
    init(compilationSettings: TypeScript.CompilationSettings): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.INIT, this.uid, compilationSettings);
    }
    
    setScriptIsOpen(path: string, value: boolean): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.SET_SCRIPT_IS_OPEN, this.uid, path, value);
    }
    
    addScript(path: string, content: string): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.ADD_FILE, this.uid, path, content);
    }
    
    updateScript(path: string, content: string): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.UPDATE_FILE, this.uid, path, content);
    }
    
    editScript(path: string, minChar: CodeMirror.Position, limChar: CodeMirror.Position, newText: string): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.EDIT_FILE, this.uid, path, minChar, limChar, newText);
    }
    
    removeScript(path: string): JQueryPromise<void> {
        return executeOperations(TypeScriptOperation.REMOVE_FILE, this.uid, path);
    }
    
    getReferencedFiles(path: string): JQueryPromise<string[]> {
        return executeOperations(TypeScriptOperation.GET_REFERENCES, this.uid, path);
    }
    
    
    
    getDefinitionAtPosition(path: string, position: CodeMirror.Position): JQueryPromise<{
                                                                                            fileName: string;
                                                                                            minChar: CodeMirror.Position;
                                                                                            limChar: CodeMirror.Position;
                                                                                            kind: string;
                                                                                            name: string;
                                                                                            containerKind: string;
                                                                                            containerName: string;
                                                                                        }[]> {
        return executeOperations(TypeScriptOperation.GET_DEFINITIONS, this.uid, path, position);   
    }
    
    
    getAllErrors(): JQueryPromise<{
            text: string;
            file: string;
            position: CodeMirror.Position;
            length: number;
        }> {
        return executeOperations(TypeScriptOperation.GET_ERRORS, this.uid);
    }
    
    
    getCompletionsAtPosition(path: string, position: CodeMirror.Position): JQueryPromise<TypeScript.Services.CompletionEntry[]> {
        return executeOperations(TypeScriptOperation.GET_COMPLETIONS, this.uid, path, position);   
    }
}

export = TypeScriptService;