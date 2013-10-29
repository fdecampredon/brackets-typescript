'use strict';

import ws = require('../main/workingSet');


describe('WorkingSet', function () {
    
    var workingSetFiles: string[],
        currentDocumentPath: string ='',
        documentManagerMock: brackets.DocumentManager =  {
            pathToDocument: {},
            getCurrentDocument(): brackets.Document {
                if (!this.pathToDocument.hasOwnProperty(currentDocumentPath)) {
                    this.pathToDocument[currentDocumentPath] = {
                        file: createFakeFileEntry(currentDocumentPath)
                    };
                }
                return this.pathToDocument[currentDocumentPath];
            },
            getWorkingSet(): brackets.FileEntry[] {
                return workingSetFiles.map(createFakeFileEntry);
            }
        }
    
    function createFakeFileEntry(path: string): brackets.FileEntry {
        return {
            isDirectory: false,
            isFile: true,
            fullPath: path,
            name: path.substr(path.lastIndexOf('/') + 1, path.length)
        };
    }
    
    
    var workingSet: ws.WorkingSet,
        spy = sinon.spy(),
        editionSpy = sinon.spy();
    
    beforeEach(function () {
        workingSetFiles = [
            '/path/file1.ts',
            '/path/file3.ts',
            '/path/file4.ts'
        ];
        workingSet = new ws.WorkingSet(documentManagerMock);
        workingSet.workingSetChanged.add(spy);
        workingSet.documentEdited.add(editionSpy);
    })
    
    afterEach(function () {
        workingSet.dispose()
        spy.reset();
        editionSpy.reset();
    });
    
    
    it('should return the path of all files in the workingSet', function () {
        expect(workingSet.files).toEqual(workingSetFiles);
    });
    
    
    it('should notify when a file has been added to the working set', function () {
        $(documentManagerMock).triggerHandler('workingSetAdd', createFakeFileEntry('/path/file5.ts'));
        expect(spy.calledOnce).toBe(true);
        expect(spy.args[0]).toEqual([{
            kind: ws.WorkingSetChangeKind.ADD,
            paths : ['/path/file5.ts']
        }]);
        expect(workingSet.files).toEqual(workingSetFiles.concat(['/path/file5.ts']));
    });
    
    it('should notify when a list of file has been added to the working set', function () {
        $(documentManagerMock).triggerHandler('workingSetAddList', ['/path/file5.ts', '/path/file6.ts'].map(createFakeFileEntry));
        expect(spy.calledOnce).toBe(true);
        expect(spy.args[0]).toEqual([{
            kind: ws.WorkingSetChangeKind.ADD,
            paths : ['/path/file5.ts', '/path/file6.ts']
        }]);
        expect(workingSet.files).toEqual(workingSetFiles.concat(['/path/file5.ts', '/path/file6.ts']));
    });
    
    it('should notify when a file has been removed from the working set', function () {
        $(documentManagerMock).triggerHandler('workingSetRemove', createFakeFileEntry('/path/file3.ts'));
        expect(spy.calledOnce).toBe(true);
        expect(spy.args[0]).toEqual([{
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths : ['/path/file3.ts']
        }]);
        expect(workingSet.files).toEqual(['/path/file1.ts', '/path/file4.ts']);
    });
    
    it('should notify when a list of file has been removed from the working set', function () {
        $(documentManagerMock).triggerHandler('workingSetRemoveList', ['/path/file1.ts', '/path/file3.ts'].map(createFakeFileEntry));
        expect(spy.calledOnce).toBe(true);
        expect(spy.args[0]).toEqual([{
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths : ['/path/file1.ts', '/path/file3.ts']
        }]);
        expect(workingSet.files).toEqual(['/path/file4.ts']);
    });
    
    it('should notify when a document has been edited', function () {
        var editionSpy = sinon.spy();
        workingSet.documentEdited.add(editionSpy);
        
        currentDocumentPath = '/path/file1.ts';
        $(documentManagerMock).triggerHandler('currentDocumentChange');
        var doc = documentManagerMock.getCurrentDocument(),
            changes : CodeMirror.EditorChangeLinkedList = {
                from : {
                    ch: 0,
                    line: 0
                },
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['\'use strict\'','console.log(\'Hello World\')'],
                removed : '',
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
                    removed : 'log'
                }
            };
        $(doc).triggerHandler('change', doc, changes);
        expect(editionSpy.calledOnce).toBe(true);
        expect(editionSpy.args[0][0]).toEqual([
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
       
        
        currentDocumentPath = '/path/file1.ts';
        $(documentManagerMock).triggerHandler('currentDocumentChange');
        var doc = documentManagerMock.getCurrentDocument(),
            changes : CodeMirror.EditorChangeLinkedList = {
                from : {
                    ch: 0,
                    line: 0
                },
                to: {
                    ch: 0,
                    line: 0,
                },
                text : ['hello'],
                removed: ''
            };
        $(doc).triggerHandler('change', doc, changes);
        
        currentDocumentPath = '/path/file2.ts';
        doc = documentManagerMock.getCurrentDocument();
        $(documentManagerMock).triggerHandler('currentDocumentChange');
        
        changes  ={
            from : {
                ch: 0,
                line: 0
            },
            to: {
                ch: 0,
                line: 0,
            },
            text : ['world'],
            removed: ''
        };

        $(doc).triggerHandler('change', doc,  changes);
        
        expect(editionSpy.calledTwice).toBe(true);
        expect(editionSpy.args[0][0]).toEqual([
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
    
        expect(editionSpy.args[1][0]).toEqual([
            {
                path: '/path/file2.ts',
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
});