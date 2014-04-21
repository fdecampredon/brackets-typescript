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

import TypeScriptProjectManager = require('../ts-worker/projectManager');
import TypeScriptProject = require('../ts-worker/project');
import TypeScriptProjectConfig = require('../commons/projectConfig');
import utils = require('../commons/utils');
import collections = require('../commons/collections');
import signal = require('../commons/signal');
import FileSystemMock = require('./fileSystemMock');
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;


describe('TypeScriptProjectManager', function () {
    var typeScriptProjectManager: TypeScriptProjectManager,
        fileSystemMock: FileSystemMock,
        projectConfigs: { [projectId: string]: TypeScriptProjectConfig; },
        preferenceManagerMock = {
            getProjectsConfig() {
                return Promise.cast(projectConfigs);
            },
            configChanged: new  signal.Signal<void>()
        },
        projectSpy: {
            init: jasmine.Spy;
            update: jasmine.Spy;
            dispose: jasmine.Spy;
        },
        projectFactorySpy: jasmine.Spy;
    
    function initiProjectManager() {
         typeScriptProjectManager.init('', preferenceManagerMock, fileSystemMock, null, projectFactorySpy);
    }
            
    beforeEach(function () {
        fileSystemMock = new FileSystemMock();
        projectSpy = {
            init: jasmine.createSpy('init').andCallFake(function () {
                return new Promise(resolve => {
                    setTimeout(() => resolve(true), 10);
                });
            }),
            update: jasmine.createSpy('update').andCallFake(function () {
                return new Promise(resolve => {
                    setTimeout(() => resolve(true), 10);
                });
            }),
            dispose: jasmine.createSpy('dispose')
        };   
        projectFactorySpy = jasmine.createSpy('newProject').andReturn(projectSpy);
        typeScriptProjectManager = new TypeScriptProjectManager();
       
    });
    
    afterEach(function () {
        typeScriptProjectManager.dispose();
    });
    
    describe('initialization', function () {
        it('should create a new Project for each project config pushed by the preferenceManager', function () {
            projectConfigs = {
                project1: { },
                project2: { }
            }; 

         
            initiProjectManager();
           
            waits(15);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(2);
            });
            
        });

       
        
        
        it('should dispose all registred project when disposed', function () {

            projectConfigs = {
                default: {}
            };

            initiProjectManager();
            typeScriptProjectManager.dispose();
            waitsFor(() => projectSpy.dispose.callCount === 1, 'dispose should have been called');
            runs(function() {
                expect(projectSpy.dispose.callCount).toBe(1);
            });
        });
    });
    
    describe('change handling', function () {
        it('should dispose projects that have no more config when config changes', function () {
            projectConfigs = {
                project1: {},
                project2: {}
            }; 

         
            initiProjectManager();
            
            waits(20);
            runs(function () {
                projectConfigs = {
                    project1: {}
                }; 

                preferenceManagerMock.configChanged.dispatch();
            });
           
            waits(50);
            runs(function () {
                expect(projectSpy.dispose.callCount).toBe(1);
            });    
        });
        
        
        it('should create projects that have been added in the config', function () {
            projectConfigs = {
                project1: {},
                project2: {}
            }; 

         
            initiProjectManager();
            
             projectConfigs = {
                project1: {},
                project2: {},
                project3: {}
            }; 
            
            preferenceManagerMock.configChanged.dispatch();
           
            waits(50);
            runs(function () {
                expect(projectFactorySpy.callCount).toBe(3);
            }); 
        });
        
        
        it('should update other projects', function () {
            projectConfigs = {
                project1: {},
                project2: {}
            }; 

         
            initiProjectManager();
            
            preferenceManagerMock.configChanged.dispatch();
           
            waits(50);
            runs(function () {
                expect(projectSpy.update.callCount).toBe(2);
            });    
        });
        
        
    });
    
    
    
    describe('getProjectForFiles', function () { 
        beforeEach(function () {
            var i = 0;
            projectFactorySpy.andCallFake(function () {
                var project = <any>utils.clone(projectSpy);
                project.id = i++;
                project.getProjectFileKind = function (file: string) {
                    var map: {[index: string]: TypeScriptProject.ProjectFileKind};
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
                    var stringSet = new collections.StringSet();
                    stringSet.add('/file3.ts');
                    return stringSet;
                };
                return project;
            });
            
            

            projectConfigs = {
                project1: {
                    module: 'amd',
                    sources: [
                        './file1.ts'
                    ],
                    outDir: 'bin'
                },
                project2: {
                    module: 'commonjs',
                    sources: [
                        './file2.ts'
                    ],
                    outFile: 'index.js'
                }
            };
            
            fileSystemMock.setFiles({
                '/file1.ts': 'import file1 = require("file2")',
                '/file2.ts': 'import file4 = require("file4")',
                '/file3.ts': '',
                '/file4.ts': ''
            });
            initiProjectManager();
        });
        
        it('should return a project that have the file as source if this project exist ', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file2.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(1);    
            });
        });
        
        it('should return a project that have the file has reference if this project ' +
                'exist and no project has the file as source', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file4.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(1);    
            });
        });
        
        
        it('should return a temp project if no project has file as source or reference', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file3.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(2);    
            });
        });
        
        it('should recreate a temp project if no project has file as source or reference nor the temp project', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file5.ts');
            typeScriptProjectManager.getProjectForFile('/file5.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(3);    
            });
        });
        
        it('should not recreate a temp project if the temp project has file as source or reference', function () {
            var project: any;
            typeScriptProjectManager.getProjectForFile('/file3.ts');
            typeScriptProjectManager.getProjectForFile('/file3.ts').then(proj => project = proj);
            waitsFor(() => !!project, 'project should have been found');
            runs(function () {
                expect(project.id).toBe(2);    
            });
        });
    });
    
});
