import fs = require('../main/fileSystem');
import signal = require('../main/utils/signal');

class FileSystem implements fs.IFileSystem {
    
    constructor( 
        private files: { [path: string]: string } = {}
    ) {}
    
    getProjectFiles(forceRefresh?: boolean): JQueryPromise<string> {
        var deferred = $.Deferred();
        deferred.resolve(Object.keys(this.files));
        return deferred.promise();
    }
    
    readFile(path: string): JQueryPromise<string> {
        var deferred = $.Deferred();
        if (this.files.hasOwnProperty(path)) {
            deferred.resolve(this.files[path]);
        } else {
            deferred.reject('Not found');
        }
        return deferred.promise();
    }
    
    projectFilesChanged = new signal.Signal<fs.ChangeRecord[]>();
    
    addFile(path: string, content: string) {
        if (this.files.hasOwnProperty(path)) {
            throw new Error('File already present');
        }
        this.files[path] = content;
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.ADD,
            path: path
        }]);
    } 
    
    updateFile(path: string, content: string) {
        if (!this.files.hasOwnProperty(path)) {
            throw new Error('File does not exist');
        }
        this.files[path] = content;
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.UPDATE,
            path: path
        }]);
    } 
    
    removeFile(path: string) {
        if (!this.files.hasOwnProperty(path)) {
            throw new Error('File does not exist');
        }
        delete this.files[path];
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.DELETE,
            path: path
        }]);
    }
    
    setFiles(files: { [path: string]: string }) {
        this.files = files || {};
    }
    
    reset(): void {
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.RESET
        }]);
    }
    
    
    dispose(): void {
        this.projectFilesChanged.clear();
    }
}



export = FileSystem;