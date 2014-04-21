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

import TypeScriptProject = require('../ts-worker/project');
import TypeScriptProjectConfig = require('../commons/projectConfig');
import FileSystemMock = require('./fileSystemMock');
import WorkingSetMock = require('./workingSetMock');
import utils = require('../commons/typeScriptUtils');


describe('TypeScriptProject', function () {
    
    var fileSystemMock: FileSystemMock,
        workingSetMock: WorkingSetMock,
        typeScriptProject: TypeScriptProject;
    
    beforeEach(function () {
        fileSystemMock = new FileSystemMock(),
        workingSetMock = new WorkingSetMock();
    });
    
    var defaultLibLocation =  '/lib.d.ts';
    function createProject(baseDir: string, config: TypeScriptProjectConfig, init = true) {
        typeScriptProject = new TypeScriptProject(
            baseDir, 
            $.extend({}, utils.typeScriptProjectConfigDefault, config),
            fileSystemMock,
            workingSetMock,
            defaultLibLocation
        );
        if (init) {
            typeScriptProject.init();
        }
    };
    
     
    afterEach(function () {
        if (typeScriptProject) {
            typeScriptProject.dispose();
            typeScriptProject = null;
        }
        fileSystemMock.dispose();
        workingSetMock.dispose();
    });
       
    function expectToBeEqualArray(actual: any[], expected: any[]) {
        expect(actual.sort()).toEqual(expected.sort());
    }

    function testWorkingSetOpenCorrespondance() {
        var languageServiceHost = typeScriptProject.getLanguageServiceHost();
        typeScriptProject.getProjectFilesSet().values.forEach(fileName => {
            expect(languageServiceHost.getScriptIsOpen(fileName)).toBe(workingSetMock.files.indexOf(fileName) !== -1);
        });
    }
    
    
    function getProjectFileContent(fileName: string) {
        var snapshot = typeScriptProject.getLanguageServiceHost().getScriptSnapshot(fileName);
        return snapshot.getText(0, snapshot.getLength());
    }
    describe('initialization', function () {
     
        
        it('should collect every files in the file system corresponding to the \'sources\' section of the given config', function () {
            fileSystemMock.setFiles({
                '/root/file1.ts': '',
                '/root/project/file2.ts': '',
                '/root/project/src/file3.ts': '',
                '/root/project/src/file4.ts': '',
                '/root/project/src/dir/file5.ts': '',
                '/root/project/src/dir/file6.other': ''
            });
           
            createProject('/root/project/', {
                sources : [
                    '../file1.ts',
                    'src/**/*ts'
                ]
            });
            waits(20);
            runs(function () {
                 expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/root/file1.ts',
                    '/root/project/src/file3.ts',
                    '/root/project/src/file4.ts',
                    '/root/project/src/dir/file5.ts'
                ]);    
            });
        });
        
        it('should collect every files referenced or imported by files in the source ', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file3")',
                '/src/file2.ts': '///<reference path="../other/file4.ts"/>',
                '/other/file3.ts': '///<reference path="./file5.ts"/>',
                '/other/file4.ts': '',
                '/other/file5.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/src/file2.ts',
                    '/other/file3.ts',
                    '/other/file4.ts',
                    '/other/file5.ts'
                ]);
            });
        });
        
        it('should collect files added if they match the \'sources\' section of the given config', function () {
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            
            fileSystemMock.addFile('/src/file1.ts', '');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts'
                ]);
            });
        });
        
        
        it('should collect referenced files from file added ', function () {
            fileSystemMock.setFiles({
                '/other/file3.ts': '///<reference path="./file5.ts"/>',
                '/other/file4.ts': '',
                '/other/file5.ts': ''
            });
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.addFile('/src/file1.ts', 'import test = require("../other/file3")');
            
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/other/file3.ts',
                    '/other/file5.ts'
                ]);
            });
          
        });
        
        it('should collect files added if they are referenced by another file ', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file2")'
            });
            
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.addFile('/other/file2.ts', '');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/other/file2.ts'
                ]);
            });
        });
        
        it('should remove files from project when they are deleted', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/src/file2.ts': ''
            });
            
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.removeFile('/src/file1.ts');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file2.ts'
                ]);
            });
        });
        
        it('should remove referenced files from the project when a source file referencing it is deleted', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file3")',
                '/src/file2.ts': '',
                '/other/file3.ts': '///<reference path="./file5.ts"/>',
                '/other/file5.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.removeFile('/src/file1.ts');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file2.ts'
                ]);
            });
        });
        
        
        it('should remove referenced files from the project when a source file referencing it is deleted, ' + 
                'only if it is not referenced by another file', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file3")',
                '/src/file2.ts': 'import test = require("../other/file3")',
                '/other/file3.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.removeFile('/src/file1.ts');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file2.ts',
                    '/other/file3.ts'
                ]);
            });
        });
        
        
        it('should remove a referenced files from the project when deleted', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file3")',
                '/src/file2.ts': 'import test = require("../other/file3")',
                '/other/file3.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.removeFile('/other/file3.ts');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/src/file2.ts'
                ]);
            });
        });
        
        
        it('recollect a referenced files from the project when deleted then readded', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import test = require("../other/file3")',
                '/src/file2.ts': 'import test = require("../other/file3")',
                '/other/file3.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.removeFile('/other/file3.ts');
            fileSystemMock.addFile('/other/file3.ts', '');
            
            waits(20);
            runs(function () {  
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/src/file2.ts',
                    '/other/file3.ts'
                ]);
            });
        });
        
        
        it('should update project files when they change', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.updateFile('/src/file1.ts', 'hello');
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('hello');
            });
        });
        
        
        it('should collect a file reference when a file change', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/other/file2.ts' : ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.updateFile('/src/file1.ts', '///<reference path="../other/file2.ts"/>');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts',
                    '/other/file2.ts'
                ]);
            });
        });
        
        
        it('should remove referenced files when a file change, and does not reference them anymore', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '///<reference path="../other/file2.ts"/>',
                '/other/file2.ts' : ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            fileSystemMock.updateFile('/src/file1.ts', '');
            waits(20);
            runs(function () {
                expectToBeEqualArray(typeScriptProject.getProjectFilesSet().values, [
                    '/src/file1.ts'
                ]); 
            });
        });
        
        it('should add the default library if noLib is not specified or false', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/lib.d.ts': ''
            });

            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            waits(20);
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has(defaultLibLocation)).toBe(true);
            });
        });

        it('should not add the default library if noLib is not specified or false', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/lib.d.ts': ''
            });

            createProject('/', {
                sources : [
                    'src/**/*ts'
                ],
                noLib: true
            });
            waits(20);
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has(defaultLibLocation)).toBeFalsy();
            });
         });
        
        
         it('should create a new typescript factory instance if a typescript path is specified',  function () {
            fileSystemMock.setFiles({
                '/typescript/typescriptServices.js' : 
                    'var TypeScript = {\
                        Services: {\
                            TypeScriptServicesFactory: function () { \
                                return { \
                                    createCoreServices: function () { return {} }, \
                                    createPullLanguageService: function () {  return { id:\'hello\'} }\
                                }\
                            }\
                        }\
                    };',
                '/lib.d.ts': ''
            });
            
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ],
                typescriptPath: '/typescript'
            });

            waits(50);
            runs(function () {
                expect(typeScriptProject.getLanguageService()).toEqual({id: 'hello'});
            });
        });
        
    });
    
    
    describe('update', function () {
        beforeEach(function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': 'import file3 = require(\'./file3\');',
                '/src/file2.ts': '///<reference path="./file4.ts" />',
                '/src/file3.ts': '',
                '/src/file4.ts': '',
                '/lib.d.ts': ''
            });
            
            createProject('/', {
                target: 'es5',
                sources : [
                    'src/file1.ts'
                ]
            });
            waits(20);
        });
        
        function updateProject(config: TypeScriptProjectConfig) {
             typeScriptProject.update($.extend({}, utils.typeScriptProjectConfigDefault, config));
        }
        
        it('should update compilerOptions if compiler options does have changed', function () {
            expect(typeScriptProject.getLanguageServiceHost().getCompilationSettings().codeGenTarget)
                .toBe(TypeScript.LanguageVersion.EcmaScript5);
            
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : [ 'src/file1.ts' ]
            });
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getLanguageServiceHost().getCompilationSettings().codeGenTarget)
                    .toBe(TypeScript.LanguageVersion.EcmaScript3);
            });
        }); 
        
        it('should remove project files that are not included anymore in the source', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/src/file1.ts')).toBe(true);
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : []
            });
            
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has('/src/file1.ts')).toBeFalsy();
            });
        }); 
        
        
        it('should add project files that matches the new configuration', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/src/file2.ts')).toBeFalsy();
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : [
                     'src/file2.ts'
                ]
            });
            
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has('/src/file2.ts')).toBe(true);
            });
        }); 
        
        
        it('should remove project files that are not referenced anymore in the source', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/src/file3.ts')).toBe(true);
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : [
                     'src/file2.ts'
                ]
            });
            
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has('/src/file3.ts')).toBeFalsy();
            });
        }); 
        
        
        it('should add project files that are now referenced by a file in the sources', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/src/file4.ts')).toBeFalsy();
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : [
                     'src/file2.ts'
                ]
            });
            
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has('/src/file4.ts')).toBe(true);
            });
        });
        
        it('should remove default lib if the new config noLib properties is set to true', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/lib.d.ts')).toBe(true);
            updateProject({
                target: 'es3',
                module: 'commonjs',
                noLib: true,
                sources : []
            });
            
            waits(20);
            
            runs(function () {
                expect(typeScriptProject.getProjectFilesSet().has('/lib.d.ts')).toBeFalsy();
            });
        });
        
        it('should mark as `open` files that have been added and that are in the working set', function () {
            expect(typeScriptProject.getProjectFilesSet().has('/src/file2.ts')).toBeFalsy();
            workingSetMock.files = [
                '/src/file1.ts',
                '/src/file2.ts'
            ];
            
            updateProject({
                target: 'es3',
                module: 'commonjs',
                sources : [
                     'src/file2.ts'
                ]
            });
            
            waits(20);
            
            
            
            runs(function () {
                testWorkingSetOpenCorrespondance();
            });
        });
        
        
        it('should reinitialize the project if typeScriptPath has changed', function () {
            var spy = spyOn(typeScriptProject, 'init').andCallThrough();
            expect(typeScriptProject.getProjectFilesSet().has('/src/file2.ts')).toBeFalsy();
           
            updateProject({
                target: 'es3',
                typescriptPath: 'typescript',
                sources : [
                     'src/file2.ts'
                ]
            });
          
            expect(spy).toHaveBeenCalled();
        }); 
    });
   
 
    describe('getProjectFileKind', function () {
        it('should return \'SOURCE\' if the file path match the \'sources\' section of the given config', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            waits(20);
            runs(function () {
                expect(typeScriptProject.getProjectFileKind('/src/file1.ts')).toBe(TypeScriptProject.ProjectFileKind.SOURCE);
            });
        });
        
        
        it('should return \'REFERENCE\' if the file is a referenced file', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '///<reference path="../other/file2.ts"/>',
                '/other/file2.ts' : ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            waits(20);
            runs(function () {
                expect(typeScriptProject.getProjectFileKind('/other/file2.ts')).toBe(TypeScriptProject.ProjectFileKind.REFERENCE);
            });
        });
        
        it('should return \'NONE\' if the file is a nor a part of the project', function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/other/file2.ts' : ''
            });
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            
            waits(20);
            runs(function () {
                expect(typeScriptProject.getProjectFileKind('/other/file2.ts')).toBe(TypeScriptProject.ProjectFileKind.NONE);
            });
        });
        
    });
    
    
    describe('working set handling', function () {
        beforeEach(function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': '',
                '/src/file2.ts': '',
                '/src/file3.ts': '',
                '/src/file4.ts': '',
                '/src/file5.ts': ''
            });
            
            workingSetMock.files = [
                '/src/file1.ts',
                '/src/file2.ts'
            ];
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
            waits(20);
        });
        
        
        it('should mark as \'open\' every file of the working set', function () {
            testWorkingSetOpenCorrespondance();
        });
        
        it('should mark as \'open\' every file added to working set', function () {
            workingSetMock.addFiles(['/src/file3.ts', '/src/file4.ts']);
            waits(20);
            runs(function () {
                testWorkingSetOpenCorrespondance();
            });
        });
        
        it('should mark as \'closed\' every file removed from the working set', function () {
            workingSetMock.removeFiles(['/src/file1.ts']);
            waits(20);
            runs(function () {
                testWorkingSetOpenCorrespondance();
            });
        });
        
    });
    
    
  
    describe('file edition', function () {
        beforeEach(function () {
            fileSystemMock.setFiles({
                '/src/file1.ts': ''
            });
            
            workingSetMock.files = [
                '/src/file1.ts'
            ];
           
            createProject('/', {
                sources : [
                    'src/**/*ts'
                ]
            });
        });
        
      
        it('should edit a script when a document corresponding to a project file\'s is edited', function () {
            workingSetMock.documentEdited.dispatch({
                path: '/src/file1.ts',
                changeList: [{
                    from: {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'console.log(\'hello world\')',
                    removed: ''
                }],
                documentText : 'console.log(\'hello world\')'
            });
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('console.log(\'hello world\')');
                workingSetMock.documentEdited.dispatch({
                    path: '/src/file1.ts',
                    changeList: [{
                        from: {
                            ch: 8,
                            line: 0
                        },
                        to: {
                            ch: 11,
                            line: 0,
                        },
                        text: 'warn',
                        removed: '',
                     }],
                    documentText : 'console.warn(\'hello world\')'
                });
            });
            
            
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('console.warn(\'hello world\')');
            });
        });
        
        it('should set script with given document content if change dispatched does not have \'to\' or \'from\' property ', function () {
            workingSetMock.documentEdited.dispatch({
                path: '/src/file1.ts',
                changeList: [{
                    from: {
                        ch: 0,
                        line: 0
                    }
                }],
                documentText : 'console.log(\'hello world\')'
            });
                
                
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('console.log(\'hello world\')');
                workingSetMock.documentEdited.dispatch({
                    path: '/src/file1.ts',
                    changeList: [{
                        to: {
                            ch: 11,
                            line: 0,
                        }
                    }],
                    documentText : 'console.warn(\'hello world\')'
                });
            });
            
            
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('console.warn(\'hello world\')');
            });
        });
        
        it('should set script with given document content if change dispatched are not coherent', function () {
            workingSetMock.documentEdited.dispatch({
                path: '/src/file1.ts',
                changeList: [{
                    from: {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'console.log(\'hello world\')',
                    removed: ''
                }],
                documentText : 'console.warn(\'hello world\')'
            });
                
                
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('console.warn(\'hello world\')');
            });
        });
        
        
        it('should revert a file when a document have been closed without saving', function () {
           workingSetMock.documentEdited.dispatch({
                path: '/src/file1.ts',
                changeList: [{
                    from: {
                        ch: 0,
                        line: 0
                    },
                    to: {
                        ch: 0,
                        line: 0,
                    },
                    text: 'console.log(\'hello world\')',
                    removed: ''
                }],
                documentText : 'console.log(\'hello world\')'
            });
            workingSetMock.removeFiles(['/src/file1.ts']);
            waits(20);
            runs(function () {
                expect(getProjectFileContent('/src/file1.ts')).toBe('');
            });
        });
        
    });
    
        
});
