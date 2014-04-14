import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;
import signal = require('./signal');


//--------------------------------------------------------------------------
//
//  IFileSystem
//
//--------------------------------------------------------------------------

/**
 * A simple wrapper over brackets filesystem that provide simple function and 
 * typed watcher
 */
export interface FileSystem {
    
    getProjectRoot(): Promise<string>
    
    /**
     * a signal dispatching fine grained change reflecting the change that happens in the working set
     */
    projectFilesChanged: signal.Signal<FileChangeRecord[]>
    
    /**
     * return a promise that resolve with a string containing the files in the project
     */
    getProjectFiles(): Promise<string[]>;
    
    /**
     * read a file, return a promise with the file content
     * @param path the file to read
     */
    readFile(path: string): Promise<string>;
    
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
export interface FileChangeRecord {
    kind : FileChangeKind;
    path? : string;
}


