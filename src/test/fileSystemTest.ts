'use strict';

import fs = require('../main/fileSystem');
import fsMock = require('./fileSystemMock');
import d = fsMock.d;
import f = fsMock.f;

describe('FileSystem', function() {
    
    var fileSystem: fs.IFileSystem,
        fileSystemMock : fsMock.FileSystem,
        rootDir: fsMock.Directory,
        projectManager  = {
            getAllFiles(filter? : (file: brackets.File) => boolean, includeWorkingSet? : boolean)  {
                var deferred = $.Deferred<brackets.File[]>(),
                    files: brackets.File[] = [];
                rootDir.visit(entry => {
                    if (entry.isFile) {
                        files.push(<brackets.File> entry)
                    }
                    return true;
                }, null, () => {
                    deferred.resolve(files);    
                })
                return deferred.promise();
            }
        };

    beforeEach(function () {
        rootDir = d(<fsMock.DirectoryOptions><any>{
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
                d(<fsMock.DirectoryOptions><any>{
                    name : 'subdir1/',
                    children: [
                        f({
                            name: 'file3.ts',
                            content: 'File3 content'
                        })
                    ]
                }),
                d(<fsMock.DirectoryOptions><any>{
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
                        d(<fsMock.DirectoryOptions><any>{
                            name : 'subdir3/',
                            children: [
                                f({
                                    name: 'file6.ts',
                                    content: 'File6 content'
                                }),
                                f({
                                    name: 'file7.ts',
                                    content: 'File7 content'
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
        fileSystemMock = new fsMock.FileSystem(rootDir);
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
        
        
        it('should not call the projectManager getAllFiles when no \'refresh\' has occured', () => {
            var spy = spyOn(projectManager,'getAllFiles').andCallThrough()
            runs(() => {
                fileSystem.getProjectFiles();
                fileSystem.getProjectFiles();
            });
            
            runs(() => {
                expect(spy.callCount).toBe(1);
            })
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
                expect(error).toBe(fsMock.FILE_NOT_FOUND); 
            })
        }); 
        
        
        it('should not call native fileSystem get Files if the File has been cached', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough()
            runs(() => {
                fileSystem.getProjectFiles().then(()=> {
                    fileSystem.readFile('/subdir2/subdir3/file6.ts');  
                });
            });
            
            runs(() => {
                expect(spy.callCount).toBe(0)
            })
        }); 
        
        
         it('should  call native fileSystem get Files if the File is not a project file', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough()
            runs(() => {
                fileSystem.getProjectFiles().then(()=> {
                    fileSystem.readFile('/subdir2/subdir3/file8.ts');
                });
            });
            
            runs(() => {
                expect(spy.callCount).toBe(1)
            })
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
                expect(error).toBe(fsMock.FILE_NOT_FOUND); 
            })
        }); 
        
        
        it('should not call native fileSystem get Files if the File has been cached', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough()
            runs(() => {
                fileSystem.getProjectFiles().then(()=> {
                    fileSystem.readFile('/subdir2/subdir3/file6.ts');  
                });
            });
            
            runs(() => {
                expect(spy.callCount).toBe(0)
            })
        }); 
        
        
        it('should  call native fileSystem get Files if the File is not a project file', function () {
            var spy = spyOn(fileSystemMock,'getFileForPath').andCallThrough()
            runs(() => {
                fileSystem.getProjectFiles().then(()=> {
                    fileSystem.readFile('/subdir2/subdir3/file8.ts');
                });
            });
            
            runs(() => {
                expect(spy.callCount).toBe(1)
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
        
        it('should dispatch a \'refresh\' event when a refresh occurs', function () {
            fileSystemMock.refresh(d({name : '/', children: []}));
            expect(changeSpy.callCount).toBe(1)
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.REFRESH
            }]);
        });
        
        
        it('should not dispatch any event after a refresh until it has been refreshed', function () {
            fileSystemMock.refresh(d({name : '/', children: []}));
            var file = f({
                name: 'hello',
                content : ''
            }, '/hello', '/');
            
            fileSystemMock.addEntry(file)
            expect(changeSpy.callCount).toBe(1)
        });
        
        
        it('should dispatch an event when a file is updated', function () {
            fileSystemMock.updateFile('/subdir2/file4.ts', 'New content');
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.UPDATE,
                path: '/subdir2/file4.ts'
            }]);
        });
        
        
        it('shouldd ispatch an event when a file is deleted', function () {
            fileSystemMock.deleteEntry('/subdir2/file4.ts');
            expect(changeSpy.callCount).toBe(1);
            expect(changeSpy).toHaveBeenCalledWith([{
                kind: fs.FileChangeKind.DELETE,
                path: '/subdir2/file4.ts'
            }]);
        });
        
        
        it('should  dispatch an event when a file is added', function () {
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
            var dir = d(<fsMock.DirectoryOptions><any>{
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
                    d(<fsMock.DirectoryOptions><any>{
                        name: 'subdir6/',
                        children: [
                            f({
                                name: 'file10.ts',
                                content: 'File 10 content'
                            }),
                            d(<fsMock.DirectoryOptions><any>{
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
            var dir = d(<fsMock.DirectoryOptions><any>{
                name: 'subdir5/',
                children: []
            });
            dir.setParent(fileSystemMock.getEntryForFile('/subdir1/', 'directory'));        
            
            fileSystemMock.addEntry(dir);
            expect(changeSpy.callCount).toBe(0);
            
        });
        
    });
    
});