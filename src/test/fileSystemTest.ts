'use strict';

import fileSystem = require('../main/fileSystem');




describe('FileSystemService', function () {
    
    
    var fileInfos: brackets.FileInfo[],
        fileIndexManagerMock: brackets.FileIndexManager = {
            getFileInfoList(indexName: string): JQueryPromise<brackets.FileInfo[]> {
                var result = $.Deferred();
                result.resolve(fileInfos);
                return result.promise();
            }
        },
        projectManagerMock: brackets.ProjectManager = {
            getProjectRoot(): brackets.DirectoryEntry {
                return {
                    createReader(): brackets.DirectoryReader {
                        return null;
                    },
                    getFile(file:string,  options: { create?: boolean; exclusive?: boolean;}, 
                                success: (file: brackets.FileEntry) => void, error?: (error:any) => void):void {
                        success({
                            isDirectory: false,
                            isFile: true,
                            fullPath: file,
                            name: file.substr(file.lastIndexOf('/'), file.length)
                        });
                    },
                    getDirectory(directory:string, options: { create?: boolean; exclusive?: boolean;}, 
                                    success: (file: brackets.FileEntry) => void, error?: (error:any) => void):void {
                        success(null)
                    },
                    isDirectory: true,
                    isFile: false,
                    fullPath: '',
                    name: '',
                };
            }
        },
        documentManagerMock: brackets.DocumentManager = { },
        content: { [path: string]: string }, 
        fileUtilsMock = {
            readAsText(entry: brackets.FileEntry): JQueryPromise<any> {
                var deferred = $.Deferred();
                deferred.resolve(content[entry.fullPath]);
                return deferred.promise();
            },
            
            writeText(entry: brackets.FileEntry, text:string): JQueryPromise<any> {
                return null;
            }
        };
    
    
    var service: fileSystem.FileSystemService,
        spy: SinonSpy = sinon.spy();
    
    function createService() {
        service = new fileSystem.FileSystemService(projectManagerMock, documentManagerMock, fileIndexManagerMock, fileUtilsMock);
    }
    
    beforeEach(function () {
        
        content = {};
        fileInfos = [];
    });
    
    afterEach(function () {
        service.dispose();
        spy.reset();
    });
    
    describe('getProjectFiles', function () {
        it('should return a list of the project files paths', function () {
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                },
                {
                    fullPath: '/path/file2',
                    name: 'file2'
                },
                {
                    fullPath: '/path/file3',
                    name: 'file3'
                }
            ]
            createService();
            service.getProjectFiles().then(spy);
            expect(spy.calledOnce).toBe(true);
            expect(spy.args[0]).toEqual([['/path/file1', '/path/file2', '/path/file3']]);
        });
        
        it('should refresh the list of project files paths if forceRefresh is set to \'true\'', function () {
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                },
                {
                    fullPath: '/path/file2',
                    name: 'file2'
                },
                {
                    fullPath: '/path/file3',
                    name: 'file3'
                }
            ]
            createService();
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                },
                {
                    fullPath: '/path/file2',
                    name: 'file2'
                },
                {
                    fullPath: '/path/file3',
                    name: 'file3'
                },
                {
                    fullPath: '/path/file4',
                    name: 'file4'
                }
            ]
            
            service.getProjectFiles(true).then(spy);
            expect(spy.calledOnce).toBe(true);
            expect(spy.args[0]).toEqual([['/path/file1', '/path/file2', '/path/file3', '/path/file4']]);
        });
        
        
        it('should not refresh the list of project files paths if forceRefresh is set to \'false\'', function () {
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                },
                {
                    fullPath: '/path/file2',
                    name: 'file2'
                },
                {
                    fullPath: '/path/file3',
                    name: 'file3'
                }
            ]
            createService();
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                },
                {
                    fullPath: '/path/file2',
                    name: 'file2'
                },
                {
                    fullPath: '/path/file3',
                    name: 'file3'
                },
                {
                    fullPath: '/path/file4',
                    name: 'file4'
                }
            ]
            
            service.getProjectFiles().then(spy);
            expect(spy.calledOnce).toBe(true);
            expect(spy.args[0]).toEqual([['/path/file1', '/path/file2', '/path/file3']]);
        });
    });
    
    
    describe('readFile', function () {
        it('should read the content of the file', function () {
            fileInfos = [
                {
                    fullPath: '/path/file1',
                    name: 'file1'
                }
            ];
            content = {
                '/path/file1' : 'hello'
            };
            
            createService();
            service.readFile('/path/file1').then(spy);
            expect(spy.calledOnce).toBe(true);
            expect(spy.args[0]).toEqual(['hello']);
        });
        
    })
            
    describe('projectFilesChanged', function () {
        beforeEach(function () {
            fileInfos = [
                { 
                    fullPath: '/path/file1',
                    name: 'file1'
                }, {
                    fullPath: '/path/file2',
                    name: 'file2'
                }, {
                    fullPath: '/path/file3',
                    name: 'file3'
                },
            ];
            createService();
            service.projectFilesChanged.add(spy);
        });
        
        
       
        it('should notify when a file is deleted', function() {
            fileInfos = [
               {
                    fullPath: '/path/file1',
                    name: 'file1'
                }, {
                    fullPath: '/path/file3',
                    name: 'file3'
                },
            ]
            $(projectManagerMock).triggerHandler('projectFilesChange');
            expect(spy.called).toBe(true);
            expect(spy.args[0][0]).toEqual([{
                kind: fileSystem.FileChangeKind.DELETE,
                path:  '/path/file2'
            }]);
         });
        
        it('should notify a change when a file is added', function() {
            fileInfos = [
                { 
                    fullPath: '/path/file1',
                    name: 'file1'
                }, {
                    fullPath: '/path/file2',
                    name: 'file2'
                }, {
                    fullPath: '/path/file3',
                    name: 'file3'
                },{
                    fullPath: '/path/file4',
                    name: 'file4'
                },
            ]
            $(projectManagerMock).triggerHandler('projectFilesChange');
            expect(spy.called).toBe(true);
            expect(spy.args[0][0]).toEqual([{
                kind: fileSystem.FileChangeKind.ADD,
                path: '/path/file4'
            }]);
        });
        
          
        it('should notify a  refresh change when a projectFile are refreshed', function() {
            $(projectManagerMock).triggerHandler('projectRefresh');
            expect(spy.called).toBe(true);
            expect(spy.args[0][0]).toEqual([{
                kind: fileSystem.FileChangeKind.REFRESH
            }]);
        });
        
        function checkFileUpdateNotification() {
            expect(spy.called).toBe(true);
            expect(spy.args[0][0]).toEqual([{
                kind: fileSystem.FileChangeKind.UPDATE,
                path: '/path/file3'
            }]);
        }
      
        
        it('should notify a change when a file is updated, when DocumentManager dispatch \’documentSaved\’', function() {
            $(documentManagerMock).triggerHandler('documentSaved', {
                file: {
                    isDirectory: false,
                    isFile: true,
                    fullPath: '/path/file3',
                    name: 'file3'
                }
            });
            checkFileUpdateNotification();
        });
        
        it('should notify a change when a file is updated, when DocumentManager dispatch \’documentRefreshed\’', function() {
            $(documentManagerMock).triggerHandler('documentRefreshed', {
                file: {
                    isDirectory: false,
                    isFile: true,
                    fullPath: '/path/file3',
                    name: 'file3'
                }
            });
            checkFileUpdateNotification();
        });
        
    });
    
});
