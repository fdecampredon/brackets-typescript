'use strict';

import signal = require('./utils/signal');

export interface IFileSystemService {
    getProjectFiles(forceRefresh?: boolean): JQueryPromise<string []>;
    readFile(path: string): JQueryPromise<string>;
    projectFilesChanged: signal.ISignal<ChangeRecord[]> ;
    dispose(): void;
}



export class FileSystemService {
    private projectManager: brackets.ProjectManager;
    private documentManager: brackets.DocumentManager;
    private fileIndexManager: brackets.FileIndexManager;
    private fileUtils: brackets.FileUtils;
    
    private files: string[];
    
    private _projectFilesChanged: FileSystemObserver;
    
    get projectFilesChanged(): signal.ISignal<ChangeRecord[]> {
        return this._projectFilesChanged;
    }
    
    constructor(
        projectManager: brackets.ProjectManager, 
        documentManager: brackets.DocumentManager,  
        fileIndexManager: brackets.FileIndexManager,
        fileUtils: brackets.FileUtils
    ) {
        this.projectManager = projectManager;
        this.documentManager = documentManager;
        this.fileIndexManager = fileIndexManager;
        this.fileUtils = fileUtils;
        
        this._projectFilesChanged = new FileSystemObserver($(projectManager), $(documentManager), () => this.getProjectFiles(true) );
        this._projectFilesChanged.add(this.projectFilesChangedsHandler);
        
    }
    
    
    getProjectFiles(forceRefresh: boolean = false): JQueryPromise<string []> {
        var deferred = $.Deferred()
        var result = deferred.promise();
        
        if (this.files && !forceRefresh) {
            deferred.resolve(this.files);
        } else {
            this.fileIndexManager.getFileInfoList('all').then((files: brackets.FileInfo[]) => {
                this.files = files.map( fileInfo => fileInfo.fullPath);
                deferred.resolve(this.files);
            });
        }
        
        return result;
    }
        
    readFile(path: string): JQueryPromise<string> {
        var result = $.Deferred();
        this.projectManager.getProjectRoot().getFile(path, { create : false }, (fileEntry: brackets.FileEntry) => {
            this.fileUtils.readAsText(fileEntry).then( (content: string) => { 
                result.resolve(content); 
            }, () => { 
                result.reject.apply(result, arguments);
            });
        }, () => {
            result.reject.call(result, path, arguments);
        });
        return result.promise();
    }

    dispose(): void {
        this._projectFilesChanged.dispose();
    }
   
    
    
    private projectFilesChangedsHandler = (records: ChangeRecord[]) => {
        records.forEach((record: ChangeRecord) => {
            switch(record.kind) {
                case FileChangeKind.ADD:
                    this.files.push(record.path);
                    break;
                case FileChangeKind.DELETE:
                    var index = this.files.indexOf(record.path);
                    if (index !== -1) {
                        this.files.splice(index, 1);
                    }
                    break;
            }
        });
    }
}
    
    


export enum FileChangeKind {
    ADD,
    UPDATE,
    DELETE,
    REFRESH
}

export interface ChangeRecord {
    kind : FileChangeKind;
    path? : string;
}

var uidHelper = 0;


class StringSet {
    map: { [path: string]: boolean };
    
    constructor() {
        this.map = Object.create(null)
    }
    
    add(value: string): void {
        this.map[value] = true;
    }
    
    remove(value: string): boolean {
        return delete this.map[value];
    }
    
    has(value: string): boolean {
        return this.map[value];
    }
    
    forEach(callback: (value: string) => void) {
        return Object.keys(this.map).forEach(callback)
    }
}

class FileSystemObserver extends signal.Signal<ChangeRecord[]>  {
    
    private files: brackets.FileInfo[];
    private fileSet: StringSet;
    private namespace: string = '.fileSystemObserver' + (uidHelper++);
    private projectManager: JQuery;
    private documentManager: JQuery;
    private projectFilesResolver: () => JQueryPromise<string[]>
    
    
    constructor(projectManager: JQuery, documentManager: JQuery,  projectFilesResolver: () => JQueryPromise<string>) {
        super();
        this.projectManager = projectManager;
        this.documentManager = documentManager;
        this.projectFilesResolver = projectFilesResolver;
        this.refresh().then( p => this.addListeners());
    }
    
    
    dispose():void {
        this.projectManager.off(this.namespace);
        this.documentManager.off(this.namespace);
    }
    
    private refresh(): JQueryPromise<void> {
        this.fileSet = new StringSet();
        return this.collectFiles();
    }
    
    private collectFiles(): JQueryPromise<void> {
        return this.projectFilesResolver().then((files: string[]) => {
            for (var i = 0, l = files.length; i < l; i++) {
                this.fileSet.add(files[i]);
            }
            return;
        });
    }
    
    private addListeners():void {
        this.projectManager.on('projectFilesChange' + this.namespace, () => {
            this.compareAndUpdate();
        });
        
        this.projectManager.on('projectRefresh' + this.namespace, () => {
            this.refresh();
            this.dispatch([{ kind: FileChangeKind.REFRESH}]);
        });
        
        this.documentManager.on('documentSaved' + this.namespace, (event: any, document: brackets.Document) => {
            this.documentChangesHandler(document);
        });
        
        this.documentManager.on('documentRefreshed' + this.namespace, (event: any, document: brackets.Document) => {
            this.documentChangesHandler(document);
        });
    }
    
    private compareAndUpdate():void {
        var oldFileSet = this.fileSet;
        this.fileSet = new StringSet();
        this.collectFiles().then(() => {
            
            var changes: ChangeRecord[] = [],
                path: string;
            
            oldFileSet.forEach((path: string) => {
                 if (!this.fileSet.has(path)) {
                    changes.push({
                        kind: FileChangeKind.DELETE,
                        path: path
                    });
                }
            });
            
            this.fileSet.forEach((path: string) => {
                if (!oldFileSet.has(path)) {
                    changes.push({
                        kind: FileChangeKind.ADD,
                        path: path
                    });
                }
            });
            
            
            if (changes.length > 0) {
                this.dispatch(changes);
            }
        });
    }
    
    private documentChangesHandler(document: brackets.Document) {
        this.dispatch([{
            kind: FileChangeKind.UPDATE,
            path: document.file.fullPath
        }]);
    }
}


