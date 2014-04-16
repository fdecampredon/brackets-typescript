//   Copyright 2013-2014 François de Campredon
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

/*istanbulify ignore file*/

'use strict';

import fs = require('../commons/fileSystem');
import signal = require('../commons/signal');
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;;

class FileSystem implements fs.IFileSystem {
    
    constructor( 
        private files: { [fileName: string]: string } = {}
    ) {}
    
    
    getProjectRoot() {
        return Promise.cast('/');
    }
    
    getProjectFiles(forceRefresh?: boolean): Promise<string[]> {
        return new Promise(resolve => {
            resolve(Object.keys(this.files))
        });
    }
    
    readFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.files.hasOwnProperty(fileName)) {
                resolve(this.files[fileName]);
            } else {
                reject('Not found');
            } 
        })
    }
    
    projectFilesChanged = new signal.Signal<fs.FileChangeRecord[]>();
    
    addFile(fileName: string, content: string) {
        if (this.files.hasOwnProperty(fileName)) {
            throw new Error('File already present');
        }
        this.files[fileName] = content;
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.ADD,
            fileName: fileName
        }]);
    } 
    
    updateFile(fileName: string, content: string) {
        if (!this.files.hasOwnProperty(fileName)) {
            throw new Error('File does not exist');
        }
        this.files[fileName] = content;
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.UPDATE,
            fileName: fileName
        }]);
    } 
    
    removeFile(fileName: string) {
        if (!this.files.hasOwnProperty(fileName)) {
            throw new Error('File does not exist');
        }
        delete this.files[fileName];
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.DELETE,
            fileName: fileName
        }]);
    }
    
    setFiles(files: { [fileName: string]: string }) {
        this.files = files || {};
    }
    
    reset(): void {
        this.projectFilesChanged.dispatch([{
            kind : fs.FileChangeKind.RESET,
            fileName: null
        }]);
    }
    
    
    dispose(): void {
        this.projectFilesChanged.clear();
    }
}



export = FileSystem;