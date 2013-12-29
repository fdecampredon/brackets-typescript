
import collections = require('../commons/collections');
import TypeScriptOperation = require('../commons/tsOperations');



class TypeScriptService {
    
    private worker: Worker =  new Worker(require.toUrl('../ts-worker/ts-worker.js'));
    
    private pendingOperations: JQueryDeferred<any>[] = [];
      
    public init(compilationSettings: TypeScript.CompilationSettings): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.INIT, compilationSettings);
    }
    
    public setScriptIsOpen(path: string, value: boolean): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.SET_SCRIPT_IS_OPEN, path, value);
    }
    
    public addScript(path: string, content: string): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.ADD_FILE, path, content);
    }
    
    public updateScript(path: string, content: string): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.UPDATE_FILE, path, content);
    }
    
    public editScript(path: string,minChar: number, limChar: number, newText: string): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.EDIT_FILE, path, minChar, limChar, newText);
    }
    
    public removeScript(path: string): JQueryPromise<void> {
        return this.executeOperations(TypeScriptOperation.REMOVE_FILE);
    }
    
    public getReferencedFiles(path: string): JQueryPromise<string[]> {
        return this.executeOperations(TypeScriptOperation.GET_REFERENCES, path);
    }
    
    private executeOperations(operation: TypeScriptOperation, ...rest: any[]): JQueryPromise<any> {
        var deferred = $.Deferred();
        this.pendingOperations.push(deferred);
        this.worker.postMessage({
            operation : operation,
            arguments: rest
        });
        return deferred.promise();
    }
    
    private messageHandler = (event : MessageEvent) => {
        var deferred = this.pendingOperations.shift();
        if (event.data.isError) {
            deferred.reject(event.data.error);
        } else {
            deferred.resolve(event.data);
        }
    }
}

export = TypeScriptService;