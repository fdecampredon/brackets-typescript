'use strict';

import signal = require('./utils/signal');
import collections = require('./utils/collections');


//--------------------------------------------------------------------------
//
//  IFileSystem
//
//--------------------------------------------------------------------------

/**
 * A simple wrapper over brackets filesystem that provide simple function and 
 * typed watcher
 */
export interface IFileSystem {
    /**
     * a signal dispatching fine grained change reflecting the change that happens in the working set
     */
    projectFilesChanged: signal.ISignal<ChangeRecord[]> ;
    
    /**
     * return a promise that resolve with a string containing the files in the project
     */
    getProjectFiles(): JQueryPromise<string []>;
    
    /**
     * read a file, return a promise with the file content
     * @param path the file to read
     */
    readFile(path: string): JQueryPromise<string>;
    
    /**
     * reset the wrapper and dispatch a refresh event
     */
    reset(): void;
    
    /**
     * clean the wrapper for disposal
     */
    dispose(): void;
}


//--------------------------------------------------------------------------
//
//  Change record
//
//--------------------------------------------------------------------------


/**
 * enum representing the kind change possible in the fileSysem
 */
export enum FileChangeKind {
    /**
     * a file has been added
     */
    ADD,
    
    /**
     * a file has been updated
     */
    UPDATE,
    
    /**
     * a file has been deleted
     */
    DELETE,
    
    /**
     * the project files has been reset 
     */
    RESET
}

/**
 * represent a change in file system
 */
export interface ChangeRecord {
    kind : FileChangeKind;
    path? : string;
}


//--------------------------------------------------------------------------
//
//  IFileSystem implementation
//
//--------------------------------------------------------------------------


/**
 * Extracted interface of the brackets FileSystem
 */
export interface BracketsFileSystem{
    getFileForPath(path: string): brackets.File; 
    on(event: string, handler: (event: any, entry?: brackets.FileSystemEntry) => any): void
    off(event: string, handler: (event: any, entry?: brackets.FileSystemEntry) => any): void
} 

/**
 * extracted inteface of the brackets ProjectManager
 */
export interface BracketsProjectManager {
    getAllFiles(filter?: (file: brackets.File) => boolean, includeWorkingSet?: boolean):JQueryPromise<brackets.File[]>;
}


/**
 * IFileSystem implementations
 */
export class FileSystem implements IFileSystem {
    //-------------------------------
    //  constructor
    //-------------------------------
    
    constructor(
        private nativeFileSystem: BracketsFileSystem,
        private projectManager: BracketsProjectManager
    ) {
        nativeFileSystem.on('change', this.changesHandler);
        this.init();
    }
    
    //-------------------------------
    //  Variables
    //-------------------------------
    
    /**
     * map path to native files
     */
    private filesContent = new collections.StringMap<string>();
    
    /**
     * cache of the paths list
     */
    private filesPath: string[] = [];
    
    /**
     * boolean containing the initialization state of the wrapper
     */
    private initialized = false;
    
    /**
     * a stack containing all the call that have been performed before initiliazation
     */
    private initializationStack: { (): void }[] = [];
    
 
    private _projectFilesChanged = new signal.Signal<ChangeRecord[]>();
    
    //-------------------------------
    //  IFileSystem implementation
    //-------------------------------
    
    /**
     * @see IFileSystem.projectFilesChanged
     */
    get projectFilesChanged(): signal.ISignal<ChangeRecord[]> {
        return this._projectFilesChanged;
    }
    
    /**
     * @see IFileSystem.getProjectFiles
     */
    getProjectFiles(): JQueryPromise<string[]> {
        var deferred = $.Deferred<string[]>();
        this.addToInitializatioStack(() => deferred.resolve(this.filesPath));
        return deferred.promise();
    }
      
    /**
     * @see IFileSystem.readFile
     */
    readFile(path: string): JQueryPromise<string> {
        var result = $.Deferred<string>();
        this.addToInitializatioStack(() => {
            if (this.filesContent.has(path)) {
                result.resolve(this.filesContent.get(path))
            } else {
                var file = this.nativeFileSystem.getFileForPath(path);
                file.read({}, (err: string, content: string) => {
                    if (err) {
                        result.reject(err);
                    } else {
                        content = content && this.normalizeText(content);
                        this.filesContent.set(path, content); 
                        result.resolve(content);
                    }
                });
            }
        });
        return result.promise();
    }
    
    /**
     * @see IFileSystem.reset
     */
    reset(): void {
        this.initialized = false;
        this.filesContent.clear();
        this.filesPath.length = 0;
        this.init();
        this._projectFilesChanged.dispatch([{
            kind: FileChangeKind.RESET
        }]);
    }
    

    /**
     * @see IFileSystem.dispose
     */
    dispose(): void {
        this.nativeFileSystem.off('change', this.changesHandler);
        this._projectFilesChanged.clear();
    }
    
    //-------------------------------
    //  privates methods
    //-------------------------------
    
     /**
     * initialize the wrapper
     */
    private init() {
        this.projectManager.getAllFiles().then((files: brackets.File[]) => {
            this.filesPath = files? files.map(file => file.fullPath) : [];
            this.initialized = true;
            this.resolveInitializationStack();
        });
    }
    
   

    /**
     * execute an operation if initialized, add to initialization stack if not
     */
    private addToInitializatioStack(callback: () => void) {
        if (this.initialized) {
            callback();
        } else {
            this.initializationStack.push(callback)
        }
    }
    
    private resolveInitializationStack() {
        this.initializationStack.forEach(callback => callback());
        this.initializationStack.length = 0;
    }
    
    /**
     * retrieves all files contained in a directory (and in subdirectory)
     */
    private getDirectoryFiles(directory: brackets.Directory): JQueryPromise<brackets.File[]> {
        var deferred = $.Deferred(),
            files: brackets.File[] = []; 
        
        directory.visit(entry => {
            if (entry.isFile) {
                files.push(<brackets.File> entry);
            }
            return true;
        }, {} , (err) => {
            deferred.resolve(files);
        });
        return deferred.promise()
    }

    /**
     * normalize text to be conform to codemirro
     * @param text
     */
    private normalizeText(text: string) {
        return text.replace(/\r\n/g, "\n");
    }
    
    //-------------------------------
    //  Events handler
    //-------------------------------
   
    /**
     * handle project workspaces changes
     */
    private changesHandler = (event: any, file? : brackets.FileSystemEntry) => {
        if (!file) {
            // a refresh event
            var oldPathsSet = new collections.StringSet(),
                oldFilesContent = this.filesContent.clone(),
                oldPaths = this.filesPath.map(path => {
                    oldPathsSet.add(path);
                    return path;
                });
            
            this.initialized = false;
            this.filesContent.clear();
            this.filesPath.length = 0;
            
            this.projectManager.getAllFiles().then(files => {
                
                var fileAdded: string[] = [],
                    fileDeleted: string[] = [],
                    fileUpdated: string[] = [],
                    newPathsSet = new collections.StringSet(),
                    promises: JQueryPromise<any>[] = []; 
                
                this.filesPath = (files || []).map(file => {
                    if (!oldPathsSet.has(file.fullPath)) {
                        fileAdded.push(file.fullPath);
                    }
                    if (oldFilesContent.has(file.fullPath)) {
                        var deferred = $.Deferred<any>();
                        promises.push(deferred.promise());
                        file.read({}, (err: string, content: string) => {
                            if (!err) {
                                this.filesContent.set(file.fullPath, content)
                            }
                            if (err || content !== oldFilesContent.get(file.fullPath)) {
                                fileUpdated.push(file.fullPath);
                            } 
                            deferred.resolve();
                        });
                    }
                    newPathsSet.add(file.fullPath);
                    return file.fullPath;
                });
                
                oldPaths.forEach(path => {
                    if (!newPathsSet.has(path)) {
                        fileDeleted.push(path)
                    }
                });
                
                (<JQueryPromise<any>>$.when.apply($, promises)).then(() => {
                    
                    var changes: ChangeRecord[] = fileDeleted.map(path => {
                        return {
                            kind: FileChangeKind.DELETE,
                            path: path
                        }
                    }).concat(fileAdded.map(path => {
                        return {
                            kind: FileChangeKind.ADD,
                            path: path
                        }
                    })).concat(fileUpdated.map(path => {
                        return {
                            kind: FileChangeKind.UPDATE,
                            path: path
                        }
                    }));
                
                    if (changes.length > 0) {
                        this.projectFilesChanged.dispatch(changes);  
                    }
                    this.initialized = true;
                    this.resolveInitializationStack();
                });
                
            }, () => {
                this.reset()
            });
            
        } else if (file.isFile) {
            //file have been updated simply dispatch an update event and update the cache if necessary
            
            var dispatchUpdate = () => {
                this.projectFilesChanged.dispatch([{
                   kind: FileChangeKind.UPDATE,
                   path: file.fullPath
                }]);
            };
            
            if (this.filesContent.has(file.fullPath)) {
                // if the file content has been cached update the cache
                this.filesContent.delete(file.fullPath);
                this.readFile(file.fullPath).then((content) => {
                    this.filesContent.set(file.fullPath, content)
                }).always(dispatchUpdate);
            } else {
                dispatchUpdate()
            }
            
       } else if(file.isDirectory) { 
            // a directory content has been changed need to make diff between cache an directory
            var directory = <brackets.Directory> file,
                children: brackets.FileSystemEntry;
           
            directory.getContents((err: string, files: brackets.FileSystemEntry[]) => {
                if (err) {
                    // an err occured reset 
                    this.reset();
                }
                var oldFiles: { [path: string]: string[]} = {},
                    newFiles: { [path: string]: brackets.FileSystemEntry} = {};
                
                //collect all the paths in the cache
                this.filesPath.forEach(path  => {
                    var index = path.indexOf(directory.fullPath)
                    if (index !== -1) {
                        var index2 = path.indexOf('/', index + directory.fullPath.length);
                        if (index2 === -1) {
                            oldFiles[path] = [path];
                        } else {
                            //in case of subdir regroup the files by subdir
                            var dirPath = path.substring(0, index2 + 1);
                            if (!oldFiles[dirPath]) {
                                oldFiles[dirPath] = [path];
                            } else {
                                oldFiles[dirPath].push(path);
                            }
                        }
                    }
                });
                
                files.forEach(file  => {
                    newFiles[file.fullPath] = file;
                });
                
                var changes: ChangeRecord[] = [];
                for (var path in oldFiles) {
                    if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path)) {
                        //for each files that has been deleted add a DELETE record
                        oldFiles[path].forEach(path => {
                            var index = this.filesPath.indexOf(path);
                            if (index !== -1) {
                                this.filesPath.splice(index, 1);
                                this.filesContent.delete(path);
                                changes.push({
                                    kind: FileChangeKind.DELETE,
                                    path : path
                                });
                            }
                        });
                    }
                }
                
                var promises: JQueryPromise<any>[] = []
                for (var path in newFiles) {
                    if (newFiles.hasOwnProperty(path) && !oldFiles.hasOwnProperty(path))  {
                        //if a file has been added just add a ADD record
                        if (newFiles[path].isFile) {
                            this.filesPath.push(path);
                            changes.push({
                                kind: FileChangeKind.ADD,
                                path : path
                            });   
                        } else {
                            var newDir = <brackets.Directory> newFiles[path];
                            //if a dir has been added collect each files in this directory then for each one add an 'ADD' record
                            promises.push(this.getDirectoryFiles(newDir).then( files => {
                                files.forEach(file => {
                                    this.filesPath.push(file.fullPath);
                                    changes.push({
                                        kind: FileChangeKind.ADD,
                                        path : file.fullPath
                                    });     
                                })        
                            }))
                        }
                    }
                };
                
               
                (<JQueryPromise<any>>$.when.apply($, promises)).then(() => {
                    if (changes.length > 0) {
                        this.projectFilesChanged.dispatch(changes);  
                    }  
                }, () => {
                    //in case of error reset
                    this.reset()
                });
            });
        }
    }
    
   
}