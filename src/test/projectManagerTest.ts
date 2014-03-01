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

/*istanbulify ignore file */

'use strict'

import TypeScriptProjectManager = require('../ts-worker/projectManager');
import TypeScriptProject = require('../ts-worker/project');
import fs = require('../commons/fileSystem');
import utils = require('../commons/utils');
import collections = require('../commons/collections');
import FileSystemMock = require('./fileSystemMock');
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;;


describe('TypeScriptProjectManager', function () {
    var typeScriptProjectManager: TypeScriptProjectManager,
        fileSystemMock: FileSystemMock,
        projectSpy: {
            init: jasmine.Spy;
            dispose: jasmine.Spy;
        },
        projectFactorySpy: jasmine.Spy
            
    beforeEach(function () {
        fileSystemMock = new FileSystemMock();
        projectSpy = {
            init: jasmine.createSpy('init').andCallFake(function () {
                return new Promise(resolve => {
                    setTimeout(() => resolve(true), 10)
                })
            }),
            dispose: jasmine.createSpy('dispose')
        };   
        var i = 0;
        projectFactorySpy = jasmine.createSpy('newProject').andReturn(projectSpy);
        typeScriptProjectManager = new TypeScriptProjectManager();
       
    });
    
    afterEach(function () {
        typeScriptProjectManager.dispose();
    });
    
    describe('initialization', function () {
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


            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(2);
            })
            
        });

        it('should support multiple configuration in a config file', function () {
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
                '/.brackets-typescript': JSON.stringify([
                    dirConfig,
                    dir1Config
                ])
            });


            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(2);
            });
        });



        it('should not create a project if the config file is invalid JSON',  function () {
            fileSystemMock.setFiles({
                'dir1/.brackets-typescript': '{',
            });
            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(0)
            });
        });

        it('should not create a project if the config file is not valid',  function () {
            fileSystemMock.setFiles({
                'dir1/.brackets-typescript': JSON.stringify({
                    module: 'commonjs'
                })
            });
            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(0);
            })
        });
        
        it('should  create a new typescript factory instance if a typescript path is specified',  function () {
            fileSystemMock.setFiles({
                '/typeScript/typescriptServices.js' : 
                    'var TypeScript = {\
                        Services: {\
                            TypeScriptServicesFactory: function () { return {id: "hello"}}\
                        }\
                    };',
                '/dir/.brackets-typescript': JSON.stringify({
                    module: 'amd',
                    typescriptPath: '/typeScript',
                    sources: [
                        './file1.ts',
                        './file2.ts'
                    ],
                    outDir: 'bin'
                })
            });

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(1);
                expect(projectFactorySpy.argsForCall[0][4]).toEqual({id: "hello"})
            })
        });
        
        
        it('should  not create a new project if the given typescript path is invalid',  function () {
            fileSystemMock.setFiles({
                '/typeScript/typescriptServices.js' : '',
                '/dir/.brackets-typescript': JSON.stringify({
                    module: 'amd',
                    typescriptPath: '/typeScript',
                    sources: [
                        './file1.ts',
                        './file2.ts'
                    ],
                    outDir: 'bin'
                })
            });

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(0);
            })
        });
    })
    
    
    describe('change handling', function () {
    
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
            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                fileSystemMock.removeFile('dir1/.brackets-typescript');
            })
            waits(15);
            runs(function() {
                expect(projectSpy.dispose.callCount).toBe(1);
            })
        });


        it('should create a new Project when a config file is added', function () {

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);

            fileSystemMock.addFile('dir/.brackets-typescript', JSON.stringify({
                module: 'amd',
                sources: [
                    './file1.ts',
                    './file2.ts'
                ],
                outDir: 'bin'
            }))
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(1);
            })
        });

        it('should replace a Project when a config file is added', function () {

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

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                fileSystemMock.updateFile('dir/.brackets-typescript', JSON.stringify({
                    module: 'amd',
                    sources: [
                        './file3.ts',
                        './file4.ts'
                    ],
                    outDir: 'bin'
                }));
            })
            
            waits(10)
            runs(function() {
                expect(projectSpy.dispose.callCount).toBe(1);
                expect(projectFactorySpy.callCount).toBe(2);
            })

           
        });


        it('should create a new Project when a config file is updated, and when the previous version was an incorrect config file', function () {

            fileSystemMock.setFiles({
                'dir/.brackets-typescript': '{}'
            });

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(0)

                fileSystemMock.updateFile( 'dir/.brackets-typescript', JSON.stringify({
                    module: 'amd',
                    sources: [
                        './file1.ts',
                        './file2.ts'
                    ],
                    outDir: 'bin'
                }));
            })
            
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(1);
            })
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

            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            typeScriptProjectManager.dispose();
            waits(15);
            runs(function() {
                expect(projectSpy.dispose.callCount).toBe(1);
            })
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
            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
            fileSystemMock.reset();
            waits(15);
            runs(function() {
                expect(projectSpy.dispose.callCount).toBe(1);
                expect(projectFactorySpy.callCount).toBe(2);
            })
            
        }); 
    });
    
    
    describe('getProjectForFiles', function () { 
        beforeEach(function () {
            var i = 0.
            projectFactorySpy.andCallFake(function () {
                var project = <any>utils.clone(projectSpy);
                project.id = i++;
                project.getProjectFileKind = function (file: string) {
                    var map: {[index: string]: TypeScriptProject.ProjectFileKind}
                    if (project.id === 0) {
                        map = {
                            '/file1.ts': TypeScriptProject.ProjectFileKind.SOURCE,
                            '/file2.ts': TypeScriptProject.ProjectFileKind.REFERENCE,
                            '/file3.ts': TypeScriptProject.ProjectFileKind.NONE,
                            '/file4.ts': TypeScriptProject.ProjectFileKind.NONE,
                            '/file5.ts': TypeScriptProject.ProjectFileKind.NONE
                        };
                    } else if (project.id === 1) {
                        map = {
                            '/file1.ts': TypeScriptProject.ProjectFileKind.NONE,
                            '/file2.ts': TypeScriptProject.ProjectFileKind.SOURCE,
                            '/file3.ts': TypeScriptProject.ProjectFileKind.NONE,
                            '/file4.ts': TypeScriptProject.ProjectFileKind.REFERENCE,
                            '/file5.ts': TypeScriptProject.ProjectFileKind.NONE
                        };
                    }
                    return map[file];
                },
                project.getProjectFilesSet = () => {
                    var stringSet = new collections.StringSet()
                    stringSet.add('/file3.ts');
                    return stringSet;
                }
                return project;
            })
            var dirConfig = {
                module: 'amd',
                sources: [
                    './file1.ts'
                ],
                outDir: 'bin'
            }, dir1Config = {
                module: 'commonjs',
                sources: [
                    './file2.ts'
                ],
                outFile: 'index.js'
            };

            fileSystemMock.setFiles({
                '/.brackets-typescript': JSON.stringify([{
                    module: 'amd',
                    sources: [
                        './file1.ts'
                    ],
                    outDir: 'bin'
                },{
                    module: 'commonjs',
                    sources: [
                        './file2.ts'
                    ],
                    outFile: 'index.js'
                }]),
                '/file1.ts': 'import file1 = require("file2")',
                '/file2.ts': 'import file4 = require("file4")',
                '/file3.ts': '',
                '/file4.ts': ''
            });
            typeScriptProjectManager.init('', fileSystemMock, null, projectFactorySpy);
        })
        
        it('should return a project that have the file as source if this project exist ', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file2.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(1);    
            })
        });
        
        it('should return a project that have the file has reference if this project exist and no project has the file as source', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file4.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(1);    
            })
        });
        
        
        it('should return a temp project if no project has file as source or reference', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file3.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(2);    
            })
        });
        
        it('should recreate a temp project if no project has file as source or reference nor the temp project', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file5.ts')
            typeScriptProjectManager.getProjectForFile('/file5.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(3);    
            })
        });
        
        it('should not recreate a temp project if the temp project has file as source or reference', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file3.ts')
            typeScriptProjectManager.getProjectForFile('/file3.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(2);    
            })
        });
    })
    
});    