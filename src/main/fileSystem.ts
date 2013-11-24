'use strict';

import signal = require('./utils/signal');


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
     * clean the wrapper
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
     * the project files has been refreshed
     */
    REFRESH
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
    on(event: string, handler: (...rest: any[]) => any): void
    off(event: string, handler: (...rest: any[]) => any): void
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
    
    constructor(
        private nativeFileSystem: BracketsFileSystem,
        private projectManager: BracketsProjectManager
    ) {
        this._projectFilesChanged = new signal.Signal<ChangeRecord[]>();
        nativeFileSystem.on('change', this.changesHandler);
    }
    
    /**
     * map path to native files
     */
    private files: { [path : string]: brackets.File };
    
    /**
     * cache of the paths list
     */
    private filesPaths: string[];
    
    /**
     * if true event without forceRefresh the getProjectFilesChanged will refresh the files
     */
    private isDirty: boolean = true;
    
 
    private _projectFilesChanged: signal.Signal<ChangeRecord[]>;
    
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
        
        if (!this.isDirty) {
            deferred.resolve(this.filesPaths);
        } else {
            this.projectManager.getAllFiles().then((files: brackets.File[]) => {
                if (!files) {
                    files = []
                }
                this.files = {}
                this.filesPaths = files.map(file => {
                    this.files[file.fullPath] = file; 
                    return file.fullPath
                });
                this.isDirty = false;
                deferred.resolve(this.filesPaths);
            });
        }
        
        return deferred.promise();
    }
      
    /**
     * @see IFileSystem.readFile
     */
    readFile(path: string): JQueryPromise<string> {
        var result = $.Deferred(),
            file: brackets.File;
        if (!this.isDirty && this.files.hasOwnProperty(path)) {
            file = this.files[path];
        } else {
            file = this.nativeFileSystem.getFileForPath(path)
        }
        
        file.read({}, (err: string, content: string) => {
           if (err) {
               result.reject(err);
           } else {
               result.resolve(content);
           }
        });
        
        return result.promise();
    }

    /**
     * @see IFileSystem.dispose
     */
    dispose(): void {
        this.nativeFileSystem.off('change', this.changesHandler);
        this._projectFilesChanged.clear();
    }
    
    
    /**
     * handle project workspaces changes
     */
    private changesHandler = (file? : brackets.FileSystemEntry) => {
        if (this.isDirty) {
            return
        }
        
        if (!file) {
            //everithing does have changed reset 
            this.reset();
        } else if (file.isFile) {
            //file have been updated simply dispatch an update event
            this.projectFilesChanged.dispatch([{
               kind: FileChangeKind.UPDATE,
               path: file.fullPath
            }]);
       } else if(file.isDirectory) {
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
                this.filesPaths.forEach(path  => {
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
                            var index = this.filesPaths.indexOf(path);
                            if (index !== -1) {
                                this.filesPaths.splice(index, 1);
                                delete this.files[path];
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
                            this.filesPaths.push(path);
                            this.files[path] = <brackets.File> newFiles[path];
                            changes.push({
                                kind: FileChangeKind.ADD,
                                path : path
                            });   
                        } else {
                            var newDir = <brackets.Directory> newFiles[path];
                            //if a dir has been added collect each files in this directory then for each one add an 'ADD' record
                            promises.push(this.getDirectoryFiles(newDir).then( files => {
                                files.forEach(file => {
                                    this.filesPaths.push(file.fullPath);
                                    this.files[file.fullPath] = <brackets.File> newFiles[file.fullPath];
                                    changes.push({
                                        kind: FileChangeKind.ADD,
                                        path : file.fullPath
                                    });     
                                })        
                            }))
                        }
                    }
                };
                
                //if async wait for each promise to resolve then dispatch the change event (if any change occured)
                if (promises.length > 0 ) {
                    (<JQueryPromise<any>>$.when.apply($, promises)).then(() => {
                        if (changes.length > 0) {
                            this.projectFilesChanged.dispatch(changes);  
                        }  
                    }, () => {
                        //in case of error reset
                        this.reset()
                    });
                } else if (changes.length > 0) {
                    // else this patch the change record (if any change occured)
                    this.projectFilesChanged.dispatch(changes);  
                }  
                
            });
        }
    }
    
    /**
     * reset the wrapper and dispatch a refresh event
     */
    private reset():void {
        this.isDirty = true;
        this.files = null;
        this.filesPaths = null;
        this.projectFilesChanged.dispatch([{
            kind: FileChangeKind.REFRESH
        }]);
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
}