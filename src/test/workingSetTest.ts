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

import ws = require('../main/workingSet');

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
        currentEditor: ws.BracketsEditor,
        editorManagerMock = {
            getActiveEditor() {
                return currentEditor;
            },
            setActiveEditor(editor: ws.BracketsEditor) {
                var previous = currentEditor
                currentEditor = editor;
                $(this).triggerHandler("activeEditorChange", [currentEditor, previous]);
            }
        },
        workingSet: ws.IWorkingSet
    
    beforeEach(function () {
        workingSetFiles = [
            '/path/file1.ts',
            '/path/file3.ts',
            '/path/file4.ts'
        ];
        
        currentEditor = {
            document : {
                file: {fullPath : '/path/file1.ts'},
                getText() { return "hello world"}
            }
        };
        workingSet = new ws.WorkingSet(documentManagerMock, editorManagerMock);
    })
    
    afterEach(function () {
        workingSet.dispose();
    });
    
    describe('files', function () {
        it('should return the list of file in the working set', function () {
            expect(workingSet.files).toEqual(workingSetFiles);
        });
    });
    
    describe('workingSetChanged', function () {
        var spy = jasmine.createSpy('workingSetChangedHandler');
        
        beforeEach(function () {
            workingSet.workingSetChanged.add(spy);
        });
        
        afterEach(function () {
            workingSet.workingSetChanged.remove(spy);
            spy.reset();
        });
        
        
        it('should notify when a file has been added to the working set', function () {
            documentManagerMock.addFile('/path/file5.ts');
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.ADD,
                paths : ['/path/file5.ts']
            });
            expect(workingSet.files).toEqual(workingSetFiles);
        });
        
        it('should notify when a list of file has been added to the working set', function () {
            documentManagerMock.addFiles(['/path/file5.ts', '/path/file6.ts']);
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.ADD,
                paths : ['/path/file5.ts', '/path/file6.ts']
            });
            expect(workingSet.files).toEqual(workingSetFiles);
        });
        
        it('should notify when a file has been removed from the working set', function () {
            documentManagerMock.removeFile('/path/file3.ts');
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.REMOVE,
                paths : ['/path/file3.ts']
            });
            expect(workingSet.files).toEqual(workingSetFiles);
        });
        
        it('should notify when a list of file has been removed from the working set', function () {
            documentManagerMock.removeFiles(['/path/file1.ts', '/path/file3.ts']);
            expect(spy.callCount).toBe(1);
            expect(spy).toHaveBeenCalledWith({
                kind: ws.WorkingSetChangeKind.REMOVE,
                paths : ['/path/file1.ts', '/path/file3.ts']
            });
            expect(workingSet.files).toEqual(workingSetFiles);
        });
    });

    describe('documentEdited', function () {
        var spy = jasmine.createSpy('documentEdited');
        
        beforeEach(function () {
            workingSet.documentEdited.add(spy);
        });
        
        afterEach(function () {
            workingSet.documentEdited.remove(spy);
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
            expect(spy).toHaveBeenCalledWith([
                {
                    path: '/path/file1.ts',
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
                    path: '/path/file1.ts',
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
                }
            ]);
        });
        
        it('should notify when a multiple document have been edited', function () {
           
            var doc = currentEditor.document;
            $(doc).triggerHandler('change', [doc, {
                from : {
                    ch: 0,
                    line: 0
                },
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['hello'],
                removed: null
            }]);
            
           
            doc = {
                file: { fullPath : '/path/file3.ts' },
                getText() { return ""}
            };
            editorManagerMock.setActiveEditor({ document: doc });
            
            $(doc).triggerHandler('change', [doc, {
                from : {
                    ch: 0,
                    line: 0
                },
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['world'],
                removed: null
            }]);
            
            expect(spy.callCount).toBe(2);
            expect(spy).toHaveBeenCalledWith([
                {
                    path: '/path/file1.ts',
                    from : {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'hello',
                    removed: ''
                }
            ]);
        
            expect(spy).toHaveBeenCalledWith([
                {
                    path: '/path/file3.ts',
                    from : {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'world',
                    removed: ''
                }
            ]);
        });
        
        it('should include \'documentText\' property if change does not contain \'to\' or \'from\' properties', function () {
           
            var doc = currentEditor.document;
            $(doc).triggerHandler('change', [doc, {
                text : ['hello'],
                from : {
                    ch: 0,
                    line: 0
                },
                removed: null
            }]);
            
           
            doc = {
                file: { fullPath : '/path/file3.ts' },
                getText() { return "hello world"}
            };
            editorManagerMock.setActiveEditor({ document: doc });
            $(doc).triggerHandler('change', [doc, {
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['world'],
                removed: null
            }]);
            
            expect(spy.callCount).toBe(2);
            expect(spy).toHaveBeenCalledWith([
                {
                    path: '/path/file1.ts',
                    from : {
                        ch: 0,
                        line: 0
                    },
                    to: undefined,
                    text: 'hello',
                    removed: '',
                    documentText: "hello world"
                }
            ]);
        
            expect(spy).toHaveBeenCalledWith([
                {
                    path: '/path/file3.ts',
                    from : undefined,
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'world',
                    removed: '',
                    documentText: "hello world"
                }
            ]);
        });
        
    });
});
