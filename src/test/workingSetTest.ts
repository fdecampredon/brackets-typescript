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

/*istanbulify ignore file */

'use strict';

import WorkingSet = require('../main/workingSet');
import ws = require('../commons/workingSet');

describe('WorkingSet', function (): void {
    var workingSetFiles: string[],
        documentManagerMock = {
            getWorkingSet() {
                return workingSetFiles.map(file => { return { fullPath: file }});
            },
            addFile(path: string) {
                workingSetFiles.push(path)
                $(this).triggerHandler('workingSetAdd', { fullPath: path });
            },
            addFiles(paths: string[]) {
                workingSetFiles = workingSetFiles.concat(paths)
                $(this).triggerHandler('workingSetAddList', paths.map(path => { return { fullPath: path }}));
            },
            removeFile(path: string) {
                var index = workingSetFiles.indexOf(path);
                if (index !== -1) {
                    workingSetFiles.splice(index, 1);
                }
                $(this).triggerHandler('workingSetRemove', { fullPath: path });
            },
            removeFiles(paths: string[]) {
                workingSetFiles = workingSetFiles.filter(path => paths.indexOf(path) === -1);
                $(this).triggerHandler('workingSetRemoveList', paths.map(path => { return { fullPath: path }}))
            }
            
        },
        currentEditor: brackets.Editor,
        editorManagerMock = {
            getActiveEditor() {
                return currentEditor;
            },
            setActiveEditor(editor:  brackets.Editor) {
                var previous = currentEditor
                currentEditor = editor;
                $(this).triggerHandler("activeEditorChange", [currentEditor, previous]);
            }
        },
        workingSet: WorkingSet;
    
    beforeEach(function () {
        workingSetFiles = [
            '/path/file1.ts',
            '/path/file3.ts',
            '/path/file4.ts'
        ];
        
        currentEditor = <brackets.Editor>{
            document : {
                file: {fullPath : '/path/file1.ts'},
                getText() { return 'hello world'}
            }
        };
        workingSet = new WorkingSet(<any>documentManagerMock, <any>editorManagerMock );
    })
    
    afterEach(function () {
        workingSet.dispose();
    });
    
    describe('files', function () {
        it('should return the list of file in the working set', function () {
            expect(workingSet.getFiles()).toEqual(workingSetFiles);
        });
    });
    
    describe('workingSetChanged', function () {
        var spy = jasmine.createSpy('workingSetChangedHandler'),
            disposable: Rx.IDisposable;
        
        beforeEach(function () {
            disposable = workingSet.workingSetChanged.subscribe(spy);
        });
        
        afterEach(function () {
            disposable.dispose();
            spy.reset();
        });
        
        
        it('should notify when a file has been added to the working set', function () {
            documentManagerMock.addFile('/path/file5.ts');
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.ADD,
                paths : ['/path/file5.ts']
            });
            expect(workingSet.getFiles()).toEqual(workingSetFiles);
        });
        
        it('should notify when a list of file has been added to the working set', function () {
            documentManagerMock.addFiles(['/path/file5.ts', '/path/file6.ts']);
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.ADD,
                paths : ['/path/file5.ts', '/path/file6.ts']
            });
            expect(workingSet.getFiles()).toEqual(workingSetFiles);
        });
        
        it('should notify when a file has been removed from the working set', function () {
            documentManagerMock.removeFile('/path/file3.ts');
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.REMOVE,
                paths : ['/path/file3.ts']
            });
            expect(workingSet.getFiles()).toEqual(workingSetFiles);
        });
        
        it('should notify when a list of file has been removed from the working set', function () {
            documentManagerMock.removeFiles(['/path/file1.ts', '/path/file3.ts']);
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.REMOVE,
                paths : ['/path/file1.ts', '/path/file3.ts']
            });
            expect(workingSet.getFiles()).toEqual(workingSetFiles);
        });
    });

    describe('documentEdited', function () {
        var spy = jasmine.createSpy('documentEdited'),
            disposable: Rx.IDisposable;
        
        beforeEach(function () {
            disposable = workingSet.documentEdited.subscribe(spy);
        });
        
        afterEach(function () {
            disposable.dispose();
            spy.reset();
        });
        
        
       it('should notify when a document has been edited', function () {
            var doc = currentEditor.document
               
            $(doc).triggerHandler('change', [doc, {
                from : {
                    ch: 0,
                    line: 0
                },
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['\'use strict\'','console.log(\'Hello World\')'],
                removed : [''],
                next:  {
                    from : {
                        ch: 8,
                        line: 1
                    },
                    to: {
                        ch: 11,
                        line: 1
                    },
                    text : ['warn'],
                    removed : ['log']
                }
            }]);
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                path: '/path/file1.ts',
                changeList: [{
                    from: {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: '\'use strict\'\nconsole.log(\'Hello World\')',
                    removed: ''
                },{
                    from : {
                        ch: 8,
                        line: 1
                    },
                    to: {
                        ch: 11,
                        line: 1
                    },
                    text: 'warn',
                    removed: 'log'
                }],
                documentText: 'hello world'
           });
        });
    });
});
