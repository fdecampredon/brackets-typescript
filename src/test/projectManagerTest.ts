import project = require('../main/project');
import fs = require('../main/fileSystem');
import FileSystemMock = require('./fileSystemMock');


describe('TypeScriptProjectManager', function () {
    var typeScriptProjectManager: project.TypeScriptProjectManager,
        fileSystemMock: FileSystemMock,
        projectSpy: {
            update: jasmine.Spy;
            dispose: jasmine.Spy;
        },
        typeScriptProjectSpy: jasmine.Spy
            
    beforeEach(function () {
        fileSystemMock = new FileSystemMock();
        typeScriptProjectManager = new project.TypeScriptProjectManager(fileSystemMock, null);
        projectSpy = jasmine.createSpyObj('project', ['dispose', 'update']); 
        typeScriptProjectSpy = spyOn(typeScriptProjectManager, 'newProject').andCallFake(() => projectSpy);
    })
    
    afterEach(function () {
        typeScriptProjectManager.dispose();
    })
    
 
    
    it('should create a new Project for each brackets-typescript config file found', function () {
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
        
        fileSystemMock.setFiles({
            'dir1/file1': '', 
            'dir2/.brackets-typescript': JSON.stringify(dir2Config), 
            'dir2/file1': '', 
            'dir2/file2': '', 
            'dir3/dir4/.brackets-typescript': JSON.stringify(dir4Config),
            'dir3/dir4/file1': '',
            'dir3/dir4/file2': ''
        });
        
      
        typeScriptProjectManager.init();
        expect(typeScriptProjectSpy.callCount).toBe(2);
    });
    
    
     it('should not create a project if the config file is invalid JSON',  function () {
        fileSystemMock.setFiles({
            'dir1/.brackets-typescript': '{',
        });
        typeScriptProjectManager.init();
        expect(typeScriptProjectSpy.callCount).toBe(0)
    });
    
    it('should not create a project if the config file is not valid',  function () {
        fileSystemMock.setFiles({
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'commonjs'
            })
        });
        typeScriptProjectManager.init();
        expect(typeScriptProjectSpy.callCount).toBe(0)
    });
    
    
    it('should dispose project if the config file as been deleted', function () {
        fileSystemMock.setFiles({
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'commonjs',
                sources: [
                    './file3.ts',
                    './file4.ts'
                ],
                outFile: 'index.js'
            })
        });
        typeScriptProjectManager.init();
        fileSystemMock.removeFile('dir1/.brackets-typescript');
        expect(projectSpy.dispose.callCount).toBe(1);
    });
    
   
    it('should create a new Project when a config file is added', function () {
        
        typeScriptProjectManager.init();
        
        fileSystemMock.addFile('dir/.brackets-typescript', JSON.stringify({
            module: 'amd',
            sources: [
                './file1.ts',
                './file2.ts'
            ],
            outDir: 'bin'
        }))
        
        expect(typeScriptProjectSpy.callCount).toBe(1);
    });
    
    
    it('should update a project when a config file as been updated', function () {
        fileSystemMock.setFiles({
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        });
    
        typeScriptProjectManager.init();
        
        fileSystemMock.updateFile('dir/.brackets-typescript', JSON.stringify({
            module: 'amd',
            sources: [
                './file3.ts',
                './file4.ts'
            ],
            outDir: 'bin'
        }));
        
        expect(projectSpy.update.callCount).toBe(1);
    });
    
    it('should not update a project when a config file as been updated, and when the new version is incorrect', function () {
        fileSystemMock.setFiles({
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        });
    
        typeScriptProjectManager.init();
        
        fileSystemMock.updateFile('dir/.brackets-typescript', '{}');
        
        expect(projectSpy.update.callCount).toBe(0)
    });
    
    it('should create a new Project when a config file is updated, and when the previous version was an incorrect config file', function () {
        
        fileSystemMock.setFiles({
            'dir/.brackets-typescript': '{}'
        });
        
        typeScriptProjectManager.init();
        
        expect(typeScriptProjectSpy.callCount).toBe(0)
        
        fileSystemMock.updateFile( 'dir/.brackets-typescript', JSON.stringify({
            module: 'amd',
            sources: [
                './file1.ts',
                './file2.ts'
            ],
            outDir: 'bin'
        }));
        
        expect(typeScriptProjectSpy.callCount).toBe(1);
    });
    
    
    it('should dispose all registred project when disposed', function () {
        
        fileSystemMock.setFiles({
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        });
        
        typeScriptProjectManager.init();
        typeScriptProjectManager.dispose();
        expect(projectSpy.dispose.callCount).toBe(1);
    });

    it('should dispose all project and reinitialize when file system is refreshed', function() {
        fileSystemMock.setFiles({
            'dir/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        });
        typeScriptProjectManager.init();
        fileSystemMock.reset();
        expect(projectSpy.dispose.callCount).toBe(1);
        expect(typeScriptProjectSpy.callCount).toBe(2);
    }); 
    
});    