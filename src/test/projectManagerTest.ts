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


import project = require('../main/project');
import fs = require('../main/fileSystem');
import FileSystemMock = require('./fileSystemMock');


describe('TypeScriptProjectManager', function () {
    var typeScriptProjectManager: project.TypeScriptProjectManager,
        fileSystemMock: FileSystemMock,
        projectSpy: {
            init: jasmine.Spy;
            update: jasmine.Spy;
            dispose: jasmine.Spy;
        },
        typeScriptProjectSpy: jasmine.Spy
            
    beforeEach(function () {
        fileSystemMock = new FileSystemMock();
        typeScriptProjectManager = new project.TypeScriptProjectManager(fileSystemMock, null);
        projectSpy = jasmine.createSpyObj('project', ['init', 'dispose', 'update']); 
        typeScriptProjectSpy = spyOn(typeScriptProjectManager, 'newProject').andCallFake(() => projectSpy);
    });
    
    afterEach(function () {
        typeScriptProjectManager.dispose();
    });
    
    it('should create a new Project for each brackets-typescript config file found', function () {
        var dirConfig = {
            module: 'amd',
            sources: [
                './file1.ts',
                './file2.ts'
            ],
            outDir: 'bin'
        }, dir1Config = {
            module: 'commonjs',
            sources: [
                './file3.ts',
                './file4.ts'
            ],
            outFile: 'index.js'
        };
        
        fileSystemMock.setFiles({
            'dir1/file1': '', 
            'dir2/.brackets-typescript': JSON.stringify(dirConfig), 
            'dir2/file1': '', 
            'dir2/file2': '', 
            'dir3/dir4/.brackets-typescript': JSON.stringify(dir1Config),
            'dir3/dir4/file1': '',
            'dir3/dir4/file2': ''
        });
        
      
        typeScriptProjectManager.init();
        expect(typeScriptProjectSpy.callCount).toBe(2);
    });
    
    it('should initialize projects with registred new instance of registred Services', function () {
        fileSystemMock.setFiles({
            'dir1/.brackets-typescript': JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            })
        });
        var service = <project.ProjectService>{};
        typeScriptProjectManager.registerService(() => service)
        typeScriptProjectManager.init();
        expect(projectSpy.init).toHaveBeenCalledWith([service])
    })
    
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

    it('should dispose all project and reinitialize when file system is refreshed', function () {
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