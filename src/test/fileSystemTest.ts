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
import FileSystem = require('../main/fileSystem');
import bracketsMock = require('./bracketsMock');
import d = bracketsMock.d;
import f = bracketsMock.f;

describe('FileSystem', function() {
    
    var fileSystem: FileSystem,
        fileSystemMock: bracketsMock.FileSystem,
        rootDir: bracketsMock.Directory,
        projectManager: bracketsMock.ProjectManager;

    beforeEach(function () {
        rootDir = d({
            name: '/',
            children : [
                f({
                    name: 'file1.ts',
                    content: 'File1 content'
                }),
                f({
                    name: 'file2.ts',
                    content: 'File2 content'
                }),
                d({
                    name : 'subdir1/',
                    children: [
                        f({
                            name: 'file3.ts',
                            content: 'File3 content'
                        })
                    ]
                }),
                d({
                    name : 'subdir2/',
                    children: [
                        f({
                            name: 'file4.ts',
                            content: 'File4 content'
                        }),
                        f({
                            name: 'file5.ts',
                            content: 'File5 content'
                        }),
                        d({
                            name : 'subdir3/',
                            children: [
                                f({
                                    name: 'file6.ts',
                                    content: 'File6 content'
                                }),
                                f({
                                    name: 'file7.ts',
                                    content: 'File7 content\r\nline2\nline3\r\nline4'
                                }),
                                d({
                                    name: 'subdir4/',
                                    children: []
                                })
                            ]
                        })
                    ]
                })
            ]
        });
        fileSystemMock = new bracketsMock.FileSystem(rootDir);
        projectManager = new bracketsMock.ProjectManager(fileSystemMock);
        fileSystem = new FileSystem(<any>fileSystemMock, <any>projectManager);
    });
    
  
    
    describe('getProjectFiles', function() {
        
        it('should return a list of the project files paths', function () {
            var files: string[];
            fileSystem.getProjectFiles().then(result => files = result);
            
            waitsFor(() => !!files, 'files should be set', 20);
            runs(() => expect(files).toEqual([
                '/file1.ts',
                '/file2.ts',
                '/subdir1/file3.ts',
                '/subdir2/file4.ts',
                '/subdir2/file5.ts',
                '/subdir2/subdir3/file6.ts',
                '/subdir2/subdir3/file7.ts'
            ]));
        });
    });
    
    describe('readFile', function () {
        
        it('should return the file content', function () {
            var content: string;
            fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data);   
            waitsFor(() => !!content, 'file should be read', 20);
            runs(() => {
                expect(content).toBe('File6 content'); 
            });
        });  
        
        it('should normalize the file content', function () {
            var content: string;
            fileSystem.readFile('/subdir2/subdir3/file7.ts').then(data => content = data);   
            waitsFor(() => !!content, 'file should be read', 20);
            runs(() => {
                expect(content).toBe('File7 content\nline2\nline3\nline4'); 
            });
        });  
        
        
        it('should return an error if underlying file system return an error', function () {
            var error: string;
            fileSystem.readFile('/subdir2/subdir3/file8.ts').then(undefined, (e?: string) => error = e);   
            waitsFor(() => !!error, 'error should be set');
            runs(() => {
                expect(error).toBe(bracketsMock.FILE_NOT_FOUND); 
            });
        }); 
        
        it('should return an error if the file is a directory', function () {
            var error: string;
            fileSystem.readFile('/subdir2/subdir3').then(undefined, (e?: string) => error = e);   
            waitsFor(() => !!error, 'error should be set');
            runs(() => {
                expect(error).toBe(bracketsMock.FILE_NOT_FOUND); 
            });
        }); 
        
        it('should cache files content', function () {
            var spy = spyOn(fileSystemMock, 'getFileForPath').andCallThrough(),
                content: string;
            fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data);    
            waitsFor(() => !!content, 'file should be read', 20);
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => expect(data).toBe(content)); 
                expect(spy.callCount).toBe(1);
                expect(content).toBe('File6 content'); 
            });
        }); 
        
        it('should update cached files when they are updated', function () {
            var content: string;
            fileSystem.readFile('/subdir2/subdir3/file6.ts');
            fileSystemMock.updateFile('/subdir2/subdir3/file6.ts', 'new content');
            fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data);    
            waitsFor(() => content === 'new content', 'file should be read', 20);
            runs(() => {
                expect(content).toBe('new content'); 
            });
        });
    });
    
    
    
    
    describe('change dispatching', function () {
        var changeSpy  = jasmine.createSpy('changeSpy');
        
        beforeEach(() => {
            fileSystem.projectFilesChanged.add(changeSpy);
            //initilize the caching
            fileSystem.getProjectFiles();
        });
          
        afterEach(function () {
            changeSpy.reset();
        });
        
        it('should dispatch an event when a file is updated', function () {
            fileSystemMock.updateFile('/subdir2/file4.ts', 'New content');
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.UPDATE,
                    fileName: '/subdir2/file4.ts'
                }]);
            });
        });
        
        
        it('should ispatch an event when a file is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/file4.ts');
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/file4.ts'
                }]);
            });
        });
        
        
        it('should dispatch an event when a file is added', function () {
            fileSystemMock.addEntry(f({
                name : 'file8.ts',
                content : 'File8 Content'
            }, '/subdir2/file8.ts', '/subdir2/'));
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir2/file8.ts'
                }]);
            });
        });
        
        
        it('should dispatch an event when a non empty directory is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/');
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/file4.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/file5.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file6.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file7.ts'
                }]);
            });
        });
        
        
        it('should not dispatch an event when an empty directory is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/subdir3/subdir4/');
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(0);
            });
        });
        
        
        it('should dispatch an event when a non empty directory is added', function () {
            var dir = d({
                name: 'subdir5/',
                children: [
                    f({
                        name: 'file8.ts',
                        content: 'File 8 content'
                    }),
                    f({
                        name: 'file9.ts',
                        content: 'File 9 content'
                    }),
                    d({
                        name: 'subdir6/',
                        children: [
                            f({
                                name: 'file10.ts',
                                content: 'File 10 content'
                            }),
                            d({
                                name: 'subdir7/',
                                children: []
                            })
                        ]
                    })
                ]
            });
            dir.setParent(fileSystemMock.getEntryForFile('/subdir1/', 'directory'));        
            
            fileSystemMock.addEntry(dir);
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir1/subdir5/file8.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir1/subdir5/file9.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir1/subdir5/subdir6/file10.ts'
                }]);
            });
            
            
        });
        
        
        it('should not dispatch an event when an empty directory is added', function () {
            var dir = d({
                name: 'subdir5/',
                children: []
            });
            dir.setParent(fileSystemMock.getEntryForFile('/subdir1/', 'directory'));        
            
            fileSystemMock.addEntry(dir);
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(0);
            });
        });
        
        
        it('should dispatch an event containing all file that have been deleted/added', function () {
            var file5Content: string,
                file3Content: string;
            fileSystem.readFile('/subdir2/file5.ts').then(result => file5Content = result);
            fileSystem.readFile('/subdir1/file3.ts').then(result => file3Content = result);
            
            waitsFor(() => !!file3Content && !!file5Content, 'files should have been read', 20);
            runs(function () {
                fileSystemMock.refresh(d({
                    name: '/',
                    children : [
                        f({
                            name: 'file2.ts',
                            content: 'File2 content has changed'
                        }),
                        f({
                            name: 'file8.ts',
                            content: 'File8 content'
                        }),
                        d({
                            name : 'subdir1/',
                            children: [
                                f({
                                    name: 'file3.ts',
                                    content: 'File3 content'
                                })
                            ]
                        }),
                        d({
                            name : 'subdir2/',
                            children: [
                                f({
                                    name: 'file4.ts',
                                    content: 'File4 content'
                                }),
                                f({
                                    name: 'file5.ts',
                                    content: 'File5 content has changed'
                                })
                            ]
                        }),
                        d({
                            name : 'subdir3/',
                            children: [
                                f({
                                    name: 'file6.ts',
                                    content: 'File6 content'
                                }),
                                f({
                                    name: 'file7.ts',
                                    content: 'File7 content\r\nline2\nline3\r\nline4'
                                }),
                                d({
                                    name: 'subdir4/',
                                    children: []
                                })
                            ]
                        })
                    ]
                }));
            });
            
            waitsFor(() => changeSpy.callCount !== 0, 'change spy should have been called');
            runs(function () {
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/file1.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file6.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file7.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/file8.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir3/file6.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir3/file7.ts'
                }, {
                    kind: fs.FileChangeKind.UPDATE,
                    fileName: '/subdir2/file5.ts'
                }]);
            });
        });
        
        it('should dispatch an event  with a delete record and an add record when a file has been renamed', function () {
            var files: string[];
            
            fileSystemMock.renameFile('/subdir2/file4.ts', '/subdir2/newFile.ts');
            
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                fileName: '/subdir2/file4.ts'
            }, {
                kind: fs.FileChangeKind.ADD,
                fileName: '/subdir2/newFile.ts'
            }]);
            
            fileSystem.getProjectFiles().then(result => files = result);
            waitsFor(() => !!files, 'files should be set', 20);
            runs(() => expect(files).toEqual([
                '/file1.ts',
                '/file2.ts',
                '/subdir1/file3.ts',
                '/subdir2/file5.ts',
                '/subdir2/subdir3/file6.ts',
                '/subdir2/subdir3/file7.ts',
                '/subdir2/newFile.ts'
            ]));
        });
        
        
        it('should update the cache when a file has been renamed', function () {
            var spy = spyOn(fileSystemMock, 'getFileForPath').andCallThrough(),
                content: string, 
                newContent: string;
            
            fileSystem.readFile('/subdir2/file4.ts').then(result => content = result);  
            waitsFor(() => !!content, 'file should be read', 20);
            
            runs(() => {
                fileSystemMock.renameFile('/subdir2/file4.ts', '/subdir2/newFile.ts');
            });
            
            waits(20);
            runs(() => {
                fileSystem.readFile('/subdir2/newFile.ts').then(result => newContent = result);  
            });
            waitsFor(() => !!newContent, 'file should be read', 20);
            runs(() => {
                expect(spy.callCount).toBe(1);
                expect(content).toBe(newContent);
            });
        });
        
        
        it('should dispatch an event  with a delete record and an add fo reach file subfile of ' +
                'the directory when a directory has been renamed', function () {
                
            fileSystemMock.renameFile('/subdir2/', '/subdir4/');
            waits(20);
            runs(function () {
                expect(changeSpy.callCount).toBe(1);
                expect(changeSpy).toHaveBeenCalledWith([{
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/file4.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir4/file4.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/file5.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir4/file5.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file6.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir4/subdir3/file6.ts'
                }, {
                    kind: fs.FileChangeKind.DELETE,
                    fileName: '/subdir2/subdir3/file7.ts'
                }, {
                    kind: fs.FileChangeKind.ADD,
                    fileName: '/subdir4/subdir3/file7.ts'
                }]);
            });
        });
        
    });
    
    
    describe('initilaization stack', function () {
        it('should cache every call to getProjectFiles/readFile during inialization, and resolve them afterward', function () {
            projectManager.async = true;
            fileSystem.reset();
            var spy = spyOn(fileSystem, 'resolveInitializationStack').andCallThrough(),
                files: string[],
                content: string;
            
            fileSystem.getProjectFiles().then(result => files = result);
            fileSystem.readFile('/file1.ts').then(result => content = result);
            
            waitsFor(() => !!files && !!content, 'operation should have been resolved', 100);
            runs(() => {
                expect(spy).toHaveBeenCalled();
                expect(files).toEqual([
                    '/file1.ts',
                    '/file2.ts',
                    '/subdir1/file3.ts',
                    '/subdir2/file4.ts',
                    '/subdir2/file5.ts',
                    '/subdir2/subdir3/file6.ts',
                    '/subdir2/subdir3/file7.ts'
                ]);
                expect(content).toBe('File1 content');
            });
        });
    });
    
});
