'use strict';

import fs = require('../main/fileSystem');
import bracketsMock = require('./bracketsMock');
import d = bracketsMock.d;
import f = bracketsMock.f;

describe('FileSystem', function() {
    
    var fileSystem: fs.IFileSystem,
        fileSystemMock : bracketsMock.FileSystem,
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
        projectManager= new bracketsMock.ProjectManager(fileSystemMock);
        fileSystem = new fs.FileSystem(fileSystemMock, projectManager);
    });
    
  
    
    describe('getProjectFiles', function() {
        
        it('should return a list of the project files paths', function () {
            var files: string[] = [];
            runs(() => {
                fileSystem.getProjectFiles().then(f => {
                    files = f
                })
            });
            runs(() => expect(files).toEqual([
                '/file1.ts',
                '/file2.ts',
                '/subdir1/file3.ts',
                '/subdir2/file4.ts',
                '/subdir2/file5.ts',
                '/subdir2/subdir3/file6.ts',
                '/subdir2/subdir3/file7.ts'
            ]))
        });
        
    });
    
    describe('readFile', function () {
        
        it('should return the file content', function () {
            var content: string;
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data)    
            });
            
            runs(() => {
                expect(content).toBe('File6 content'); 
            })
        });  
        
        it('should normalize the file content', function () {
            var content: string;
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file7.ts').then(data => content = data)    
            });
            
            runs(() => {
                expect(content).toBe('File7 content\nline2\nline3\nline4'); 
            })
        });  
        
        
        it('should return an error if underlying file system return an error', function () {
            var content: string,
                error: string;
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file8.ts').then(data => {
                    content = data
                }, (e?: string, ...rest: any[]) => {
                    error = e
                });    
            });
            
            runs(() => {
                expect(error).toBe(bracketsMock.FILE_NOT_FOUND); 
            })
        }); 
        
        it('should cache files content', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough(),
                content: string;
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data);  
                fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => expect(data).toBe(content)) 
            });
            
            runs(() => {
                expect(spy.callCount).toBe(1);
                expect(content).toBe('File6 content'); 
            })
        }); 
        
        it('should update cached files when they are updated', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough(),
                content: string;
            runs(() => {
                fileSystem.readFile('/subdir2/subdir3/file6.ts');
                fileSystemMock.updateFile('/subdir2/subdir3/file6.ts', 'new content')
                fileSystem.readFile('/subdir2/subdir3/file6.ts').then(data => content = data)    
            });
            
            runs(() => {
                expect(content).toBe('new content'); 
            })
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
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.UPDATE,
                path: '/subdir2/file4.ts'
            }]);
        });
        
        
        it('should ispatch an event when a file is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/file4.ts');
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file4.ts'
            }]);
        });
        
        
        it('should dispatch an event when a file is added', function () {
            fileSystemMock.addEntry(f({
                name : 'file8.ts',
                content : 'File8 Content'
            }, '/subdir2/file8.ts', '/subdir2/'));
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir2/file8.ts'
            }]);
        });
        
        
        it('should dispatch an event when a non empty directory is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/');
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file4.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file5.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file6.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file7.ts'
            }]);
        });
        
        
        it('should not dispatch an event when an empty directory is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/subdir3/subdir4/');
            expect(changeSpy.callCount).toBe(0);
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
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir1/subdir5/file8.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir1/subdir5/file9.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir1/subdir5/subdir6/file10.ts'
            }]);
            
        });
        
        
        it('should not dispatch an event when an empty directory is added', function () {
            var dir = d({
                name: 'subdir5/',
                children: []
            });
            dir.setParent(fileSystemMock.getEntryForFile('/subdir1/', 'directory'));        
            
            fileSystemMock.addEntry(dir);
            expect(changeSpy.callCount).toBe(0);
        });
        
        
        it('should dispatch an event containing all file that have been deleted/added', function () {
            fileSystem.readFile('/subdir2/file5.ts');
            fileSystem.readFile('/subdir1/file3.ts');
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
            
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/file1.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file6.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file7.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/file8.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir3/file6.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir3/file7.ts'
            },{
                kind: fs.FileChangeKind.UPDATE,
                path: '/subdir2/file5.ts'
            }]);
            
        });
        
        it('should dispatch an event  with a delete record and an add record when a file is renamed', function () {
            var files: string[] = [];
            
            fileSystemMock.renameFile('/subdir2/file4.ts', '/subdir2/newFile.ts');
            
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file4.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir2/newFile.ts'
            }]);
            
            runs(() => {
                fileSystem.getProjectFiles().then(f => {
                    files = f
                })
            });
            runs(() => expect(files).toEqual([
                '/file1.ts',
                '/file2.ts',
                '/subdir1/file3.ts',
                '/subdir2/file5.ts',
                '/subdir2/subdir3/file6.ts',
                '/subdir2/subdir3/file7.ts',
                '/subdir2/newFile.ts'
            ]))
        });
        
        
        it('should dispatch an event  with a delete record and an add fo reach file subfile of the directory when a directory is renamed', function () {
            fileSystemMock.renameFile('/subdir2/', '/subdir4/');
             
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file4.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir4/file4.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file5.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir4/file5.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file6.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir4/subdir3/file6.ts'
            },{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/subdir3/file7.ts'
            },{
                kind: fs.FileChangeKind.ADD,
                path: '/subdir4/subdir3/file7.ts'
            }]);
        });
        
    });
    
    
   
    
});