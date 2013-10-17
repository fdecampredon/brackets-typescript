'use strict';

import signal = require('./signal');


export enum FileChangeKind {
    ADD,
    UPDATE,
    DELETE,
    REFRESH
}

export interface ChangeRecord {
    kind : FileChangeKind;
    file? : brackets.FileInfo;
}

var uidHelper = 0;


export interface IFileSystemObserver extends signal.ISignal<ChangeRecord[]>  {
    dispose():void;
}

export class FileSystemObserver extends signal.Signal<ChangeRecord[]> {
    
    private files: brackets.FileInfo[];
    private fileMap: { [path: string]: brackets.FileInfo };
    private initialized:JQueryPromise<any>;
    private uid:string = 'FileSystemObserver$' + (uidHelper++);
    private projectManager: brackets.ProjectManager;
    private documentManager: brackets.DocumentManager;
    private fileIndexManager: brackets.FileIndexManager;
    
    
    constructor(projectManager: brackets.ProjectManager, documentManager: brackets.DocumentManager,  fileIndexManager: brackets.FileIndexManager) {
        super();
        this.projectManager = projectManager;
        this.documentManager = documentManager;
        this.fileIndexManager = fileIndexManager;
        this.refresh();
        this.addListeners();
    }
    
    
    dispose():void {
        $(this.projectManager).off('.' + this.uid);
        $(this.documentManager).off('.' + this.uid);
    }
    
    private refresh() {
        var deferred = $.Deferred();
        this.fileMap = {};
        this.initialized = deferred.promise();
        this.getFilesFromIndex().then(() => {
            deferred.resolve();
        }, () => {
            deferred.reject(arguments);
        });
    }
    
    private getFilesFromIndex(): JQueryPromise<brackets.FileInfo[]> {
        return this.fileIndexManager.getFileInfoList('all').then((files: brackets.FileInfo[]) => {
            this.files = files;
            for (var i = 0, l = this.files.length; i < l; i++) {
                this.fileMap[this.files[i].fullPath] = this.files[i];
            }
        });
    }
    
    private addListeners():void {
        $(this.projectManager).on('projectFilesChange.' + this.uid, () => {
            this.compareAndUpdate();
        });
        $(this.projectManager).on('projectRefresh.' + this.uid, () => {
            this.refresh();
            this.dispatch([{ kind: FileChangeKind.REFRESH}]);
        });
        
        $(this.documentManager).on('documentSaved.' + this.uid, (event, document: brackets.Document) => {
            this.documentChangesHandler(document);
        });
        $(this.documentManager).on('documentRefreshed.' + this.uid, (event, document: brackets.Document) => {
            this.documentChangesHandler(document);
        });
    }
    
    private compareAndUpdate():void {
        this.initialized.then(() => {
            var oldFileMap = this.fileMap;
            this.fileMap = {};
            this.getFilesFromIndex().then(() => {
                
                var changes: ChangeRecord[] = [],
                    path: string;
                for (path in oldFileMap) {
                    if (oldFileMap.hasOwnProperty(path) && !this.fileMap.hasOwnProperty(path)) {
                        changes.push({
                            kind: FileChangeKind.DELETE,
                            file: oldFileMap[path]
                        });
                    }
                }
                
                for (path in this.fileMap) {
                    if (this.fileMap.hasOwnProperty(path)) {
                        if (this.fileMap.hasOwnProperty(path) && !oldFileMap.hasOwnProperty(path)) {
                            changes.push({
                                kind: FileChangeKind.ADD,
                                file: this.fileMap[path]
                            });
                        }
                    }
                }
                
                if (changes.length > 0) {
                    this.dispatch(changes);
                }
            })
        });
    }
    
    private documentChangesHandler(document: brackets.Document) {
        var path = document.file.fullPath;
        this.dispatch([{
            kind: FileChangeKind.UPDATE,
            file: this.fileMap[path]
        }]);
    }
}




export function readFile(path: string): JQueryPromise<brackets.FileInfo> {
    
    var FileUtils = brackets.getModule('file/FileUtils'),
        ProjectManager = brackets.getModule('project/ProjectManager'),
        result = $.Deferred();
    
    ProjectManager.getProjectRoot().getFile(path, { create : false }, (fileEntry: brackets.FileEntry) => {
        FileUtils.readAsText(fileEntry).then((text: string, lastUpdateDate : Date) => { 
            result.resolve({ 
                path: path, 
                content: text, 
                lastUpdateDate : lastUpdateDate 
            }); 
        }, () => { 
            result.reject(arguments);
        });
    });
    return result.promise();
}
