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