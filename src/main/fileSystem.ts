//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.


'use strict';

import collections = require('../commons/collections');
import Rx = require('rx');
import fs = require('../commons/fileSystem');




/**
 * FileSystem implementations
 */
class FileSystem implements fs.FileSystem {
    //-------------------------------
    //  constructor
    //-------------------------------
    
    constructor(
        private nativeFileSystem: brackets.FileSystem,
        private projectManager: brackets.ProjectManager
    ) {
        nativeFileSystem.on('change', this.changesHandler);
        nativeFileSystem.on('rename', this.renameHandler);
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
    
 
    private _projectFilesChanged = new Rx.Subject<fs.FileChangeRecord[]>();
    
    //-------------------------------
    //  IFileSystem implementation
    //-------------------------------
    
    /**
     * @see IFileSystem.projectFilesChanged
     */
    get projectFilesChanged(): Rx.Observable<fs.FileChangeRecord[]> {
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
                if (file.isDirectory) {
                    result.reject('not found');
                    return;
                }
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
        this._projectFilesChanged.onNext([{
            kind: fs.FileChangeKind.RESET
        }]);
    }
    

    /**
     * @see IFileSystem.dispose
     */
    dispose(): void {
        this.nativeFileSystem.off('change', this.changesHandler);
        this.nativeFileSystem.off('rename', this.renameHandler);
        this._projectFilesChanged.dispose();
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
                    
                    var changes: fs.FileChangeRecord[] = [];
                    
                    fileDeleted.forEach(path => {
                        changes.push({
                            kind: fs.FileChangeKind.DELETE,
                            path: path
                        });
                    });
                    
                    fileAdded.forEach(path => {
                        changes.push({
                            kind: fs.FileChangeKind.ADD,
                            path: path
                        });
                    });
                    
                    fileUpdated.forEach(path => {
                        changes.push({
                            kind: fs.FileChangeKind.UPDATE,
                            path: path
                        });
                    });
                
                    if (changes.length > 0) {
                        this._projectFilesChanged.onNext(changes);  
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
                this._projectFilesChanged.onNext([{
                   kind: fs.FileChangeKind.UPDATE,
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
                
                var changes: fs.FileChangeRecord[] = [];
                for (var path in oldFiles) {
                    if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path)) {
                        //for each files that has been deleted add a DELETE record
                        oldFiles[path].forEach(path => {
                            var index = this.filesPath.indexOf(path);
                            if (index !== -1) {
                                this.filesPath.splice(index, 1);
                                this.filesContent.delete(path);
                                changes.push({
                                    kind: fs.FileChangeKind.DELETE,
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
                                kind: fs.FileChangeKind.ADD,
                                path : path
                            });   
                        } else {
                            var newDir = <brackets.Directory> newFiles[path];
                            //if a dir has been added collect each files in this directory then for each one add an 'ADD' record
                            promises.push(this.getDirectoryFiles(newDir).then( files => {
                                files.forEach(file => {
                                    this.filesPath.push(file.fullPath);
                                    changes.push({
                                        kind: fs.FileChangeKind.ADD,
                                        path : file.fullPath
                                    });     
                                })        
                            }))
                        }
                    }
                };
                
               
                (<JQueryPromise<any>>$.when.apply($, promises)).then(() => {
                    if (changes.length > 0) {
                        this._projectFilesChanged.onNext(changes);  
                    }  
                }, () => {
                    //in case of error reset
                    this.reset()
                });
            });
        }
    }
    
    
    private renameHandler = (event: any, oldPath : string, newPath: string) => {
        var isDirectory = oldPath[oldPath.length -1] === '/';
        var changes: fs.FileChangeRecord[];
        if (isDirectory) {
            changes = [];
            this.filesPath.concat().forEach(path => {
                var index = path.indexOf(oldPath);
                if (index === 0) {
                    changes = changes.concat(this.fileRenamedHandler(path, path.replace(oldPath, newPath))); 
                }
            });
        } else {
            changes = this.fileRenamedHandler(oldPath, newPath);
        }
        if (changes.length > 0) {
            this._projectFilesChanged.onNext(changes);
        }
    }
    
    private fileRenamedHandler(oldPath: string, newPath: string) {
        var index = this.filesPath.indexOf(oldPath);
        if (index !== -1) {
            this.filesPath.splice(index, 1);
            this.filesPath.push(newPath);
            if (this.filesContent.has(oldPath)) {
                var content = this.filesContent.get(oldPath);
                this.filesContent.delete(oldPath);
                this.filesContent.set(newPath, content);
            }
            return [{
                kind: fs.FileChangeKind.DELETE,
                path: oldPath
            }, {
                kind: fs.FileChangeKind.ADD,
                path: newPath
            }];
        }
        return [];
    }
}

export = FileSystem;