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


/*istanbulify ignore file*/
import ws = require('../commons/workingSet');
import Rx = require('rx');
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;;

class WorkingSetMock implements ws.WorkingSet {
    files: string [] = [];
    workingSetChanged = new Rx.Subject<ws.WorkingSetChangeRecord>();
    documentEdited = new Rx.Subject<ws.DocumentChangeRecord>();
    
    getFiles() {
        return new Promise(resolve => resolve(this.files));
    }
    
    dispose(): void {
        /*this.workingSetChanged.clear();
        this.documentEdited.clear();*/
    }
    
    addFiles(paths: string[]) {
        this.files = this.files.concat(paths);
        this.workingSetChanged.onNext({
            kind: ws.WorkingSetChangeKind.ADD,
            paths: paths
        });
    }
    
    
    removeFiles(paths: string[]) {
        this.files = this.files.filter(path => paths.indexOf(path) === -1)
        this.workingSetChanged.onNext({
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths: paths
        });
    }
}

export = WorkingSetMock;