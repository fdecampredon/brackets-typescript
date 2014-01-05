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

//
//import project = require('../main/project');
//import FileSystemMock = require('./fileSystemMock');
//import WorkingSetMock = require('./workingSetMock');
//import utils = require('../main/typeScriptUtils');
//
//describe('TypeScriptProject', function () {
//    
//    var typeScriptProjectManager: project.TypeScriptProjectManager,
//        fileSystemMock: FileSystemMock,
//        typeScriptProjectSpy: jasmine.Spy,
//        workingSetMock: WorkingSetMock,
//        typeScriptProject: project.TypeScriptProject;
//    
//    beforeEach(function () {
//        fileSystemMock = new FileSystemMock(),
//        workingSetMock = new WorkingSetMock();
//    })
//    
//    function createProject(baseDir: string, config: project.TypeScriptProjectConfig, init = true) {
//        typeScriptProject = new project.TypeScriptProject(
//            baseDir, 
//            $.extend({}, utils.typeScriptProjectConfigDefault, config),
//            fileSystemMock,
//            workingSetMock
//        );
//        if (init) {
//            typeScriptProject.init();
//        }
//    };
//    
//     
//    afterEach(function () {
//        if (typeScriptProject) {
//            typeScriptProject.dispose();
//            typeScriptProject = null;
//        }
//        fileSystemMock.dispose();
//        workingSetMock.dispose();
//    });
//       
//    function expectToBeEqualArray(actual: any[], expected: any[]) {
//        expect(actual.sort()).toEqual(expected.sort());
//    }
//
//    function testWorkingSetOpenCorrespondance() {
//        typeScriptProject.getScripts().keys.forEach(path => {
//            expect(typeScriptProject.getScripts().get(path).isOpen).toBe(workingSetMock.files.indexOf(path) !== -1);
//        });
//    }
//    
//    describe('script collections', function () {
//     
//        
//        it('should collect every files in the file system corresponding to the \'sources\' section of the given config', function () {
//            fileSystemMock.setFiles({
//                '/root/file1.ts': '',
//                '/root/project/file2.ts': '',
//                '/root/project/src/file3.ts': '',
//                '/root/project/src/file4.ts': '',
//                '/root/project/src/dir/file5.ts': '',
//                '/root/project/src/dir/file6.other': ''
//            });
//           
//            createProject('/root/project/', {
//                sources : [
//                    '../file1.ts',
//                    'src/**/*ts'
//                ]
//            });
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/root/file1.ts',
//                '/root/project/src/file3.ts',
//                '/root/project/src/file4.ts',
//                '/root/project/src/dir/file5.ts'
//            ]);
//        });
//        
//        it('should collect every files referenced or imported by files in the source ', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file3")',
//                '/src/file2.ts': '///<reference path="../other/file4.ts"/>',
//                '/other/file3.ts': '///<reference path="./file5.ts"/>',
//                '/other/file4.ts': '',
//                '/other/file5.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/src/file2.ts',
//                '/other/file3.ts',
//                '/other/file4.ts',
//                '/other/file5.ts'
//            ]);
//        });
//        
//        it('should collect files added if they match the \'sources\' section of the given config', function () {
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            
//            fileSystemMock.addFile('/src/file1.ts', '');
//           
//          
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts'
//            ]);
//        });
//        
//        
//        it('should collect referenced files from file added ', function () {
//            fileSystemMock.setFiles({
//                '/other/file3.ts': '///<reference path="./file5.ts"/>',
//                '/other/file4.ts': '',
//                '/other/file5.ts': ''
//            });
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.addFile('/src/file1.ts', 'import test = require("../other/file3")');
//          
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/other/file3.ts',
//                '/other/file5.ts'
//            ]);
//          
//        });
//        
//        it('should collect files added if they are referenced by another file ', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file2")'
//            });
//            
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.addFile('/other/file2.ts', '');
//          
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/other/file2.ts'
//            ]);
//        
//        });
//        
//        it('should remove files from project when they are deleted', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/src/file2.ts': ''
//            });
//            
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.removeFile('/src/file1.ts');
//             
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file2.ts'
//            ]);
//        });
//        
//        it('should remove referenced files from the project when a source file referencing it is deleted', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file3")',
//                '/src/file2.ts': '',
//                '/other/file3.ts': '///<reference path="./file5.ts"/>',
//                '/other/file5.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.removeFile('/src/file1.ts');
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file2.ts'
//            ]);
//        });
//        
//        
//        it('should remove referenced files from the project when a source file referencing it is deleted, ' + 
//                'only if it is not referenced by another file', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file3")',
//                '/src/file2.ts': 'import test = require("../other/file3")',
//                '/other/file3.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.removeFile('/src/file1.ts');
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file2.ts',
//                '/other/file3.ts'
//            ]);
//        });
//        
//        
//        it('should remove a referenced files from the project when deleted', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file3")',
//                '/src/file2.ts': 'import test = require("../other/file3")',
//                '/other/file3.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.removeFile('/other/file3.ts');
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/src/file2.ts'
//            ]);
//        });
//        
//        
//        it('recollect a referenced files from the project when deleted then readded', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': 'import test = require("../other/file3")',
//                '/src/file2.ts': 'import test = require("../other/file3")',
//                '/other/file3.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.removeFile('/other/file3.ts');
//            fileSystemMock.addFile('/other/file3.ts','');
//            
//              
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/src/file2.ts',
//                '/other/file3.ts'
//            ]);
//        });
//        
//        
//        it('should update project files when they change', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.updateFile('/src/file1.ts', 'hello');
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('hello');
//        });
//        
//        
//        it('should collect a file reference when a file change', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/other/file2.ts' : ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.updateFile('/src/file1.ts', '///<reference path="../other/file2.ts"/>');
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts',
//                '/other/file2.ts'
//            ]);
//        });
//        
//        
//        it('should remove referenced files when a file change, and does not reference them anymore', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '///<reference path="../other/file2.ts"/>',
//                '/other/file2.ts' : ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            fileSystemMock.updateFile('/src/file1.ts', '');
//            expectToBeEqualArray(typeScriptProject.getScripts().keys, [
//                '/src/file1.ts'
//            ]); 
//        });
//    });
//    
//    
//    it('should add the default library if noLib is not specified or false', function () {
//        fileSystemMock.setFiles({
//            '/src/file1.ts': '',
//            '/lib.d.ts': ''
//        });
//        
//        utils.DEFAULT_LIB_LOCATION = '/lib.d.ts';
//        
//        createProject('/', {
//            sources : [
//                'src/**/*ts'
//            ]
//        });
//        
//        expect(typeScriptProject.getScripts().has('/lib.d.ts')).toBe(true);
//    });
//    
//    it('should not add the default library if noLib is not specified or false', function () {
//        fileSystemMock.setFiles({
//            '/src/file1.ts': '',
//            '/lib.d.ts': ''
//        });
//        
//        utils.DEFAULT_LIB_LOCATION = '/lib.d.ts';
//        
//        createProject('/', {
//            sources : [
//                'src/**/*ts'
//            ],
//            noLib: true
//        });
//        
//        expect(typeScriptProject.getScripts().has('/lib.d.ts')).toNotBe(true);
//    });
// 
//    describe('getProjectFileKind', function () {
//        it('should return \'SOURCE\' if the file path match the \'sources\' section of the given config', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            expect(typeScriptProject.getProjectFileKind('/src/file1.ts')).toBe(project.ProjectFileKind.SOURCE)
//        });
//        
//        
//        it('should return \'REFERENCE\' if the file is a referenced file', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '///<reference path="../other/file2.ts"/>',
//                '/other/file2.ts' : ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            expect(typeScriptProject.getProjectFileKind('/other/file2.ts')).toBe(project.ProjectFileKind.REFERENCE)
//        });
//        
//        it('should return \'NONE\' if the file is a nor a part of the project', function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/other/file2.ts' : ''
//            });
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            expect(typeScriptProject.getProjectFileKind('/other/file2.ts')).toBe(project.ProjectFileKind.NONE);
//        });
//        
//    });
//    
//    
//    describe('working set handling', function () {
//        beforeEach(function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/src/file2.ts': '',
//                '/src/file3.ts': '',
//                '/src/file4.ts': '',
//                '/src/file5.ts': '',
//            });
//            
//            workingSetMock.files = [
//                '/src/file1.ts',
//                '/src/file2.ts'
//            ]
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//        });
//        
//        
//        it('should mark as \'open\' every file of the working set', function () {
//            testWorkingSetOpenCorrespondance();
//        });
//        
//        it('should mark as \'open\' every file added to working set', function () {
//            workingSetMock.addFiles(['/src/file3.ts','/src/file4.ts']);
//            testWorkingSetOpenCorrespondance();
//        });
//        
//        it('should mark as \'closed\' every file removed from the working set', function () {
//            workingSetMock.removeFiles(['/src/file1.ts']);
//            testWorkingSetOpenCorrespondance();
//        });
//        
//    });
//    
//    
//    describe('ProjectService service', function () {
//        //todo more test here
//        it('should call run on initialization', function () {
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            },false);
//            var service: { run: jasmine.Spy } = jasmine.createSpyObj('service', ['run']);
//            
//            typeScriptProject.init([<project.ProjectService><any>service]);
//            
//            expect(service.run).toHaveBeenCalledWith(true, null)
//        });
//        
//        it('should call run with appropriete deleta when projects files change', function() {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/src/file2.ts': '',
//                '/src/file3.ts': '',
//                '/src/file4.ts': '',
//                '/src/file5.ts': '',
//            });
//            
//            workingSetMock.files = [
//                '/src/file1.ts',
//                '/src/file2.ts'
//            ]
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            },false);
//            
//            
//            var service: { run: jasmine.Spy } = jasmine.createSpyObj('service', ['run']);
//            typeScriptProject.init([<project.ProjectService><any>service]);
//            
//            runs(function () {
//                fileSystemMock.removeFile('/src/file2.ts');
//                fileSystemMock.removeFile('/src/file3.ts');
//                fileSystemMock.addFile('/src/file6.ts','hello');
//                fileSystemMock.updateFile('/src/file4.ts','world');
//            });
//            
//            waits(2);
//            runs(function () {
//                expect(service.run.callCount).toBe(2);
//                expect(service.run.argsForCall[1][0]).toBe(false);
//                var delta = service.run.argsForCall[1][1]
//                expect(delta.fileDeleted).toEqual(['/src/file2.ts', '/src/file3.ts']);
//                expect(delta.fileAdded).toEqual(['/src/file6.ts']);
//                expect(delta.fileUpdated).toEqual(['/src/file4.ts']);
//            })
//                    
//        })
//    });
//    
//    
//    
//    describe('language service', function () {
//        //todo more test here
//        it('should create a compilations settings', function () {
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            expect(typeScriptProject.getCompilationSettings()).toNotBe(undefined);
//        });
//        
//        it('should create a language service', function () {
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            expect(typeScriptProject.getLanguageService()).toNotBe(undefined);
//        });
//    });
//    
//    
////    describe('getFilesDependantOfFile', function () {
////        beforeEach(function () {
////             fileSystemMock.setFiles({
////                '/importedFile.ts': '',
////                '/referencedFile.ts': 'class A {}',
////                '/src/file1.ts': 'import test = require("../importedFile"); ',
////                '/src/file2.ts': '///<reference path="../referencedFile.ts"/>\nvar a = new A();',
////                '/src/file3.ts': '///<reference path="../referencedFile.ts"/>',
////                '/src/file4.ts': 'class B {}',
////                '/src/file5.ts': 'var b = new B();',
////            });
////            
////            workingSetMock.files = [
////                '/src/file1.ts',
////                '/src/file2.ts'
////            ]
////           
////            createProject('/', {
////                sources : [
////                    'src/**/*ts'
////                ],
////                module: 'amd'
////            });
////        })
////        
////        //todo more test here
////        it('should retrieve all file that imports the given path', function () {
////            expect(typeScriptProject.getFilesDependantOfFile('/importedFile.ts')).toEqual([ '/src/file1.ts']);
////        });
////        
////        it('should retrive file that reference the  given path only if symbol of the file are used', function ( ) {
////            expect(typeScriptProject.getFilesDependantOfFile('/referencedFile.ts')).toEqual(['/src/file2.ts']);
////        });
////        
////        it('should retrive file that mach the \'source\' par of the config that use symbol of the given file', function ( ) {
////            expect(typeScriptProject.getFilesDependantOfFile('/src/file4.ts')).toEqual(['/src/file5.ts']);
////        });
////        
////        it('should retrive file part of the source that use symbol of the given file', function ( ) {
////         
////            expect(typeScriptProject.getFilesDependantOfFile('/src/file4.ts')).toEqual(['/src/file5.ts']);
////        });
////        
////        it('should retrive dependencies of file that have been added', function ( ) {
////            fileSystemMock.addFile('/src/file6.ts', 'import test = require("../importedFile");var b = new B();')
////            expect(typeScriptProject.getFilesDependantOfFile('/importedFile.ts')).toEqual([ '/src/file1.ts', '/src/file6.ts']);
////            expect(typeScriptProject.getFilesDependantOfFile('/src/file4.ts')).toEqual([ '/src/file5.ts', '/src/file6.ts']);
////        });
////        
////        it('should remove dependencies of file that have been removed', function ( ) {
////            fileSystemMock.removeFile('/src/file5.ts')
////            expect(typeScriptProject.getFilesDependantOfFile('/src/file4.ts')).toEqual(null);
////        });
////        
////        
////        it('should update dependencies of file that have been updated', function ( ) {
////            fileSystemMock.removeFile('/src/file5.ts')
////            expect(typeScriptProject.getFilesDependantOfFile('/src/file4.ts')).toEqual(null);
////        });
////    });
//    
//    
//    describe('config update', function () {
//        beforeEach(function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': '',
//                '/src/file2.ts': '',
//                '/src2/file3.ts': '',
//                '/src2/file4.ts': '',
//                '/src2/file5.ts': '',
//                '/lib.d.ts': ''
//            });
//            
//            
//            utils.DEFAULT_LIB_LOCATION = '/lib.d.ts';
//        
//            
//            workingSetMock.files = [
//                '/src/file1.ts',
//                '/src/file2.ts',
//                '/src2/file3.ts',
//                '/src2/file4.ts'
//            ]
//            
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//        });
//        
//        function updateProject(config: project.TypeScriptProjectConfig) {
//            typeScriptProject.update(
//                $.extend({}, utils.typeScriptProjectConfigDefault, config)
//            );
//        };
//        
//        it('should update the compiler settings', function () {
//            updateProject({
//                sources : [
//                    'src/**/*ts'
//                ],
//                target: 'es5'
//            });
//            
//            expect(typeScriptProject.getCompilationSettings().codeGenTarget).toBe(TypeScript.LanguageVersion.EcmaScript5)
//        })
//        
//        it('should recolect files if source section have changed', function () {
//            updateProject({
//                sources : [
//                    'src2/**/*ts'
//                ]
//            });
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys,[
//                '/src2/file3.ts',
//                '/src2/file4.ts',
//                '/src2/file5.ts',
//                '/lib.d.ts'
//            ]);
//            
//            testWorkingSetOpenCorrespondance();
//        })
//        
//        it('should remove the default library if noLib has been set to false', function () {
//            updateProject({
//                sources : [
//                    'src/**/*ts'
//                ],
//                noLib: true
//            });
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys,[
//                '/src/file1.ts',
//                '/src/file2.ts'
//            ]);
//            
//        });
//        
//        it('should reopen the default library if noLib has been set to true', function () {
//            updateProject({
//                sources : [
//                    'src/**/*ts'
//                ],
//                noLib: true
//            });
//            
//            
//            updateProject({
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//            
//            expectToBeEqualArray(typeScriptProject.getScripts().keys,[
//                '/src/file1.ts',
//                '/src/file2.ts',
//                '/lib.d.ts'
//            ]);
//            
//        });
//    });
//    
//    
//    describe('file edition', function () {
//        beforeEach(function () {
//            fileSystemMock.setFiles({
//                '/src/file1.ts': ''
//            });
//            
//            workingSetMock.files = [
//                '/src/file1.ts'
//            ]
//           
//            createProject('/', {
//                sources : [
//                    'src/**/*ts'
//                ]
//            });
//        });
//        
//      
//        it('should edit a script when a document corresponding to a project file\'s is edited', function () {
//            workingSetMock.documentEdited.dispatch([{
//                path: '/src/file1.ts',
//                from: {
//                    ch: 0,
//                    line: 0
//                },
//                to: {
//                    ch: 0,
//                    line: 0,
//                },
//                text: 'console.log(\'hello world\')',
//                removed: '',
//                documentText : 'console.log(\'hello world\')'
//            }]);
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('console.log(\'hello world\')');
//            
//            workingSetMock.documentEdited.dispatch([{
//                path: '/src/file1.ts',
//                from: {
//                    ch: 8,
//                    line: 0
//                },
//                to: {
//                    ch: 11,
//                    line: 0,
//                },
//                text: 'warn',
//                removed: '',
//                documentText : 'console.warn(\'hello world\')'
//                
//            }]);
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('console.warn(\'hello world\')');
//        });
//        
//        it('should set script with given document content if change dispatched does not have \'to\' or \'from\' property ', function () {
//            workingSetMock.documentEdited.dispatch([{
//                path: '/src/file1.ts',
//                from: {
//                    ch: 0,
//                    line: 0
//                },
//                documentText : 'console.log(\'hello world\')'
//            }]);
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('console.log(\'hello world\')');
//            
//            workingSetMock.documentEdited.dispatch([{
//                path: '/src/file1.ts',
//                to: {
//                    ch: 11,
//                    line: 0,
//                },
//                documentText : 'console.warn(\'hello world\')'
//                
//            }]);
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('console.warn(\'hello world\')');
//        });
//        
//        
//        it('should revert a file when a document have been closed without saving', function () {
//           workingSetMock.documentEdited.dispatch([{
//                path: '/src/file1.ts',
//                from: {
//                    ch: 0,
//                    line: 0
//                },
//                to: {
//                    ch: 0,
//                    line: 0,
//                },
//                text: 'console.log(\'hello world\')',
//                removed: '',
//                documentText : 'console.warn(\'hello world\')'
//            }]);
//            workingSetMock.removeFiles(['/src/file1.ts']);
//            expect(typeScriptProject.getScripts().get('/src/file1.ts').content).toBe('');
//        });
//        
//    });
//    
//        
//});