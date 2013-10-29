import project = require('../main/project');
import fileSystem = require('../main/fileSystem');
import FileSystemServiceMock = require('./fileSystemMock');


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
        fileSystemServiceMock = new FileSystemServiceMock();
    
    beforeEach(function () {
        typeScriptProjectManager = new project.TypeScriptProjectManager(
            fileSystemServiceMock, 
            null,
            <project.TypeScriptProjectFactory> typeScriptProjectFactory
        );
    });
    
    afterEach(function () {
        typeScriptProjectManager.dispose();
        typeScriptProjectFactory.reset();
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
        
        fileSystemServiceMock.files = [
            'dir1/file1', 
            'dir2/.brackets-typescript', 
            'dir2/file1', 
            'dir2/file2', 
            'dir3/dir4/.brackets-typescript',
            'dir3/dir4/file1',
            'dir3/dir4/file2'
        ];
        
        
        fileSystemServiceMock.content = {
            'dir2/.brackets-typescript': JSON.stringify(dir2Config),
            'dir3/dir4/.brackets-typescript': JSON.stringify(dir4Config)
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.callCount).toBe(2);
        ///expect(typeScriptProjectFactory.args).toEqual([['dir2/', dir2Config], ['dir3/dir4', dir4Config]]);
    });
    
    it('should not create a project if the config file is invalid JSON',  function () {
         
        
        fileSystemServiceMock.files = ['dir1/.brackets-typescript'];
       
        fileSystemServiceMock.content = {
            'dir1/.brackets-typescript': '{',
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.called).toBe(false)
    });
    
    it('should not create a project if the config file is not valid',  function () {
         
        
        fileSystemServiceMock.files = ['dir1/.brackets-typescript'];
       
        fileSystemServiceMock.content = {
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'commonjs'
            })
        };
        typeScriptProjectManager.init();
        expect(typeScriptProjectFactory.called).toBe(false)
    });
    
    
    it('should dispose project if the config file as been deleted', function () {
        fileSystemServiceMock.files = ['dir1/.brackets-typescript'];
        fileSystemServiceMock.content = {
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
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.DELETE,
            path :'dir1/.brackets-typescript'
        }]);
        expect(disposeSpy.called).toBe(true);
    });
    
   
    it('should create a new Project when a config file is added', function () {
        
        fileSystemServiceMock.files = [];
        typeScriptProjectManager.init();
        
        fileSystemServiceMock.content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.ADD,
            path: 'dir/.brackets-typescript'
        }]);
        
        expect(typeScriptProjectFactory.called).toBe(true);
    });
    
    
    it('should update a project when a config file as been updated', function () {
        fileSystemServiceMock.files = ['dir/.brackets-typescript'];
        fileSystemServiceMock.content = {
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
        
        fileSystemServiceMock.content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file3.ts',
                    './file4.ts'
                ],
                outDir: 'bin'
            })
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.UPDATE,
            path: 'dir/.brackets-typescript'
        }]);
        
        expect(updateSpy.called).toBe(true);
    });
    
    it('should not update a project when a config file as been updated, and when the new version is incorrect', function () {
        fileSystemServiceMock.files = ['dir/.brackets-typescript'];
        fileSystemServiceMock.content = {
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
        
        fileSystemServiceMock.content = {
            'dir/.brackets-typescript': '{}'
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.UPDATE,
            path:  'dir/.brackets-typescript'
        }]);
        
        expect(updateSpy.called).toBe(false);
    });
    
    it('should create a new Project when a config file is updated, and when the previous version was an incorrect config file', function () {
        
        fileSystemServiceMock.files = ['dir/.brackets-typescript'];
     
        
        fileSystemServiceMock.content = {
            'dir/.brackets-typescript': '{}'
        };
        
        typeScriptProjectManager.init();
        
        expect(typeScriptProjectFactory.called).toBe(false);
        
        fileSystemServiceMock.content = {
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            
            })
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.UPDATE,
            path: 'dir/.brackets-typescript'
        }]);
        
        expect(typeScriptProjectFactory.called).toBe(true);
    });
    
    
    it('should dispose all registred project when disposed', function () {
        
        fileSystemServiceMock.files = ['dir/.brackets-typescript'];
        
        fileSystemServiceMock.content = {
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
        fileSystemServiceMock.files = ['dir/.brackets-typescript'];
     
        
        fileSystemServiceMock.content = {
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
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.REFRESH
        }]);
        
        expect(disposeSpy.called).toBe(true);
        expect(typeScriptProjectFactory.called).toBe(true);
        
        
    }); 
});
