'use strict';


//--------------------------------------------------------------------------
//
//  FileSystem
//
//--------------------------------------------------------------------------

import signal = require('./utils/signal');

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
     * @param forceRefresh if set to true refresh the internal cache
     */
    getProjectFiles(forceRefresh?: boolean): JQueryPromise<string []>;
    
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


/**
 * Errors enum
 */
export enum FileSystemError  {
    FILE_NOT_FOUND
}


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


/**
 * Extracted interface of the brackets FileSystem
 */
export interface BracketsFileSystem{
    /**
     * Return a File object for the specified path.This file may not yet exist on disk.
     *
     * @param path Absolute path of file. 
     */
    getFileForPath(path: string): brackets.File; 
    on(event: string, handler: (...rest: any[]) => any): void
    off(event: string, handler: (...rest: any[]) => any): void
} 

/**
 * extracted inteface of the brackets Project Manager
 */
export interface BracketsProjectManager {
    /**
     * Returns an Array of all files for this project, optionally including
     * files in the working set that are *not* under the project root. Files filtered
     * out by shouldShow() OR isBinaryFile() are excluded.
     *
     * @param filter Optional function to filter
     *          the file list (does not filter directory traversal). API matches Array.filter().
     * @param includeWorkingSet If true, include files in the working set
     *          that are not under the project root (*except* for untitled documents).
     *
     * @return {$.Promise} Promise that is resolved with an Array of File objects.
     */
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
    getProjectFiles(forceRefresh: boolean = false): JQueryPromise<string[]> {
        var deferred = $.Deferred<string[]>();
        
        if (!forceRefresh && !this.isDirty) {
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
        if (this.files.hasOwnProperty(path)) {
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
    
    
    
    private changesHandler = (file? : brackets.FileSystemEntry): void  => {
        if (!file) {
            this.isDirty = true;
            this.projectFilesChanged.dispatch([{
                kind: FileChangeKind.REFRESH
            }]);
        } else if (file.isFile) {
            this.projectFilesChanged.dispatch([{
               kind: FileChangeKind.UPDATE,
               path: file.fullPath
            }]);
       } else if(file.isDirectory) {
            var directory = <brackets.Directory> file,
               children: brackets.FileSystemEntry;
            directory.getContents((err: string, files: brackets.FileSystemEntry[]) => {
                if (err) {
                    this.isDirty = true;
                    this.projectFilesChanged.dispatch([{
                        kind: FileChangeKind.REFRESH
                    }]);
                    return;
                }
                var oldFiles: { [path: string]: string[]} = {},
                    newFiles: { [path: string]: brackets.FileSystemEntry} = {};
                this.filesPaths.forEach(path  => {
                    var index = path.indexOf(directory.fullPath)
                    if (index !== -1) {
                        var index2 = path.indexOf('/', index);
                        if (index2 = -1) {
                            oldFiles[path] = [path];
                        } else {
                            var dirPath = path.substring(0, index2);
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
                
                var changes: ChangeRecord[];
                for (var path in oldFiles) {
                    if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path))  {
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
                        if (newFiles[path].isFile) {
                            this.filesPaths.push(path);
                            this.files[path] = <brackets.File> newFiles[path];
                            changes.push({
                                kind: FileChangeKind.ADD,
                                path : path
                            });   
                        } else {
                            var directory = <brackets.Directory> newFiles[path];
                            promises.push(this.getDirectoryFiles(directory).then( files => {
                                files.forEach(file => {
                                    this.filesPaths.push(path);
                                    this.files[path] = <brackets.File> newFiles[path];
                                    changes.push({
                                        kind: FileChangeKind.ADD,
                                        path : path
                                    });     
                                })        
                            }))
                        }
                    }
                };
                if (promises.length > 0 ) {
                    (<JQueryPromise<any>>$.when.apply($, promises)).then(() => {
                        if (changes.length > 0) {
                            this.projectFilesChanged.dispatch(changes);  
                        }  
                    })
                } else if (changes.length > 0) {
                    this.projectFilesChanged.dispatch(changes);  
                }  
                
            });
        }
    }
    
    /**
     * retrieves all files contained in a directory (and in subdirectory)
     */
    private getDirectoryFiles(directory: brackets.Directory): JQueryPromise<brackets.File[]> {
        var deferred = $.Deferred(),
            files: brackets.File[]; 
        
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
