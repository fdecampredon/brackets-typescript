import project = require('../main/project');
import fileUtils = require('../main/utils/fileUtils');
import signal = require('../main/utils/signal');
import bracketsMock = require('./bracketsMock');

class FileSystemObserverMock extends signal.Signal<fileUtils.ChangeRecord[]> {
    dispose() {
    }
}

describe('TypeScriptProjectManager', function () {
    
    var typeScriptProjectManager: project.TypeScriptProjectManager,
        disposeSpy: SinonSpy = sinon.spy(),
        updateSpy: SinonSpy = sinon.spy(),
        typeScriptProjectFactory: SinonSpy = sinon.spy(function () {
            var result =  {
                dispose: disposeSpy,
                update: updateSpy
            };
            return result;
        }),
        fileIndexManagerMock = new bracketsMock.FileIndexManagerMock(),
        fileInfosResolver = () => {
            return fileIndexManagerMock.getFileInfoList('all');
        },
        fileSystemObserver = new FileSystemObserverMock(),
        content: { [path: string] : string},
        reader=  (path: string) => {
            var deferred = $.Deferred();
            deferred.resolve(content[path]);
            return deferred.promise();
        };
    
    beforeEach(function () {
        typeScriptProjectManager = new project.TypeScriptProjectManager(
            fileSystemObserver, 
            fileInfosResolver, 
            <{ (directory:string, config: project.TypeScriptProjectConfig) : project.TypeScriptProject }> typeScriptProjectFactory, 
            reader
        );
    });
    
    afterEach(function () {
        typeScriptProjectFactory.reset();
        typeScriptProjectManager.dispose();
        disposeSpy.reset();
        updateSpy.reset();
    });
    
    
    it('should create a new Project for each bracketsts file found', function () {
        var dir2Config = {
            module: 'amd',
            sources: [
                './file1.ts',
                './file2.ts'
            ],
            outDir: 'bin'
        
        }, dir4Config = {
            module: 'commonjs',
            sources: [
                './file3.ts',
                './file4.ts'
            ],
            outFile: 'index.js'
        };
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : 'dir1/file1',
                name : 'file1'
            },{
                fullPath : 'dir2/.brackets-typescript',
                name : '.brackets-typescript'
            }, {
                fullPath : 'dir2/file1',
                name : 'file1'
            }, {
                fullPath : 'dir2/file2',
                name : 'file2'
            }, {
                fullPath : 'dir3/dir4/.brackets-typescript',
                name : '.brackets-typescript'
            }, {
                fullPath : 'dir3/dir4/file1',
                name : 'file1'
            }, {
                fullPath : 'dir3/dir4/file2',
                name : 'file2'
            }
        ];
        
        
        content = {
            'dir2/.brackets-typescript': JSON.stringify(dir2Config),
            'dir3/dir4/.brackets-typescript': JSON.stringify(dir4Config)
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.callCount).toBe(2);
        ///expect(typeScriptProjectFactory.args).toEqual([['dir2/', dir2Config], ['dir3/dir4', dir4Config]]);
    });
    
    it('should not create a project if the config file is invalid JSON',  function () {
         
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : 'dir1/.brackets-typescript',
                name : '.brackets-typescript'
            }
        ];
       
        content = {
            'dir1/.brackets-typescript': '{',
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.called).toBe(false)
    });
    
    it('should not create a project if the config file is not valid',  function () {
         
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : 'dir1/.brackets-typescript',
                name : '.brackets-typescript'
            }
        ];
       
        content = {
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'commonjs'
            })
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.called).toBe(false)
    });
    
    
    it('should dispose project if the config file as been deleted', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : 'dir1/.brackets-typescript',
                name : '.brackets-typescript'
            }
        ];
        content = {
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'commonjs',
                sources: [
                    './file3.ts',
                    './file4.ts'
                ],
                outFile: 'index.js'
            })
        };
        typeScriptProjectManager.init();
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.DELETE,
            file: {
                fullPath : 'dir1/.brackets-typescript',
                name : '.brackets-typescript'
            }
        }]);
        expect(disposeSpy.called).toBe(true);
    });
    
    
    it('should create a new Project when a config file is added', function () {
        
        fileIndexManagerMock.fileInfos = [];
        typeScriptProjectManager.init();
        
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            
            })
        };
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.ADD,
            file: {
                fullPath : 'dir/.brackets-typescript',
                name : '.brackets-typescript'
            }
        }]);
        
        expect(typeScriptProjectFactory.called).toBe(true);
    });
    
    
    it('should update a project when a config file as been updated', function () {
        fileIndexManagerMock.fileInfos = [{
            fullPath : 'dir/.brackets-typescript',
            name : '.brackets-typescript'
        }];
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        };
    
        typeScriptProjectManager.init();
        
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file3.ts',
                    './file4.ts'
                ],
                outDir: 'bin'
            })
        };
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.UPDATE,
            file: {
                fullPath : 'dir/.brackets-typescript',
                name : '.brackets-typescript'
            }
        }]);
        
        expect(updateSpy.called).toBe(true);
    });
    
    it('should not update a project when a config file as been updated, and when the new version is incorrect', function () {
        fileIndexManagerMock.fileInfos = [{
            fullPath : 'dir/.brackets-typescript',
            name : '.brackets-typescript'
        }];
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        };
    
        typeScriptProjectManager.init();
        
        content = {
            'dir/.brackets-typescript': '{}'
        };
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.UPDATE,
            file: {
                fullPath : 'dir/.brackets-typescript',
                name : '.brackets-typescript'
            }
        }]);
        
        expect(updateSpy.called).toBe(false);
    });
    
    it('should create a new Project when a config file is updated, and when the previous version was an incorrect config file', function () {
        
        fileIndexManagerMock.fileInfos = [ {
            fullPath : 'dir/.brackets-typescript',
            name : '.brackets-typescript'
        }];
     
        
        content = {
            'dir/.brackets-typescript': '{}'
        };
        
        typeScriptProjectManager.init();
        
        expect(typeScriptProjectFactory.called).toBe(false);
        
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            
            })
        };
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.UPDATE,
            file: {
                fullPath : 'dir/.brackets-typescript',
                name : '.brackets-typescript'
            }
        }]);
        
        expect(typeScriptProjectFactory.called).toBe(true);
    });
    
    
    it('should dispose all registred project when disposed', function () {
        
        fileIndexManagerMock.fileInfos = [ {
            fullPath : 'dir/.brackets-typescript',
            name : '.brackets-typescript'
        }];
     
        
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        };
        
        typeScriptProjectManager.init();
        typeScriptProjectManager.dispose();
        expect(disposeSpy.called).toBe(true);
    });

    it('should dispose all project and reinitialize when file system is refreshed', function() {
        fileIndexManagerMock.fileInfos = [ {
            fullPath : 'dir/.brackets-typescript',
            name : '.brackets-typescript'
        }];
     
        
        content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        };
        typeScriptProjectManager.init();
        typeScriptProjectFactory.reset();
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.REFRESH
        }]);
        
        expect(disposeSpy.called).toBe(true);
        expect(typeScriptProjectFactory.called).toBe(true);
        
        
    }); 
});
