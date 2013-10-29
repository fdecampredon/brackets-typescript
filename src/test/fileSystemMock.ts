import fileSystem = require('../main/fileSystem');
import signal = require('../main/utils/signal');

class FileSystemServiceMock implements fileSystem.IFileSystemService {
    files: string[];
    content: { [path: string]: string };
    
    getProjectFiles(forceRefresh?: boolean): JQueryPromise<string> {
        var deferred = $.Deferred();
        deferred.resolve(this.files);
        return deferred.promise();
    }
    
    readFile(path: string): JQueryPromise<string> {
        var deferred = $.Deferred();
        deferred.resolve(this.content[path]);
        return deferred.promise();
    }
    
    projectFilesChanged = new signal.Signal<fileSystem.ChangeRecord[]>();
    
    dispose(): void {
    
    }
}



export = FileSystemServiceMock;