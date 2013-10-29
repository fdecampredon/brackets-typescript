import project = require('../main/project');
import fileSystem = require('../main/fileSystem');
import ws = require('../main/workingSet');
import language = require('../main/typescript/language');
import FileSystemServiceMock = require('./fileSystemMock');
import WorkingSetMock = require('./workingSetMock');

describe('TypeScriptProject', function () {
    
    var typeScriptProject: project.TypeScriptProject,
        fileSystemServiceMock: FileSystemServiceMock,
        workingSetMock: WorkingSetMock,
        addScriptSpy = sinon.spy(),
        updateScriptSpy = sinon.spy(),
        removeScriptSpy = sinon.spy(),
        setScriptIsOpenSpy = sinon.spy(),
        editScriptSpy = sinon.spy(),
        languageServiceHostMock: language.ILanguageServiceHost = <any> {
            addScript: addScriptSpy,
            updateScript: updateScriptSpy,
            removeScript: removeScriptSpy,
            setScriptIsOpen: setScriptIsOpenSpy,
            editScript: editScriptSpy,
            lineColToPosition() {
                return 0
            }
        },
        languageServiceHostFactory = sinon.spy(() => {
            return languageServiceHostMock
        });
 
    

    function createProject(baseDir: string, config: project.TypeScriptProjectConfig) {
        
        typeScriptProject = new project.TypeScriptProject(
            baseDir, 
            $.extend({}, project.typeScriptProjectConfigDefault, config),
            fileSystemServiceMock,
            workingSetMock,
            languageServiceHostFactory
        );
    };
    
    
    beforeEach(function () {
        fileSystemServiceMock = new FileSystemServiceMock();
        workingSetMock = new WorkingSetMock()
    });
    
    afterEach(function () {
        if (typeScriptProject) {
            typeScriptProject.dispose();
            typeScriptProject = null;
        }
        languageServiceHostFactory.reset();
        addScriptSpy.reset();
        removeScriptSpy.reset();
        updateScriptSpy.reset();
        setScriptIsOpenSpy.reset();
        editScriptSpy.reset();
        fileSystemServiceMock.dispose();
    });
    
    it('should collect every  files in the file system corresponding to the \'sources\' section of the given config', function () {
         
        fileSystemServiceMock.files = [
            '/root/file1.ts',
            '/root/project/file2.ts',
            '/root/project/src/file3.ts',
            '/root/project/src/file4.ts',
            '/root/project/src/dir/file5.ts',
            '/root/project/src/dir/file6.other'
        ];
       
        fileSystemServiceMock.content = {
            '/root/file1.ts': '',
            '/root/project/src/file3.ts': '',
            '/root/project/src/file4.ts': '',
            '/root/project/src/dir/file5.ts': '',
        };
        createProject('/root/project/', {
            sources : [
                '../file1.ts',
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    it('should collect files that in sources', function () {
        
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/src/file2.ts',
            '/other/file3.ts',
            '/other/file4.ts',
            '/other/file5.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file3")',
            '/src/file2.ts': '///<reference path="../other/file4.ts"/>',
            '/other/file3.ts': '///<reference path="./file5.ts"/>',
            '/other/file4.ts': '',
            '/other/file5.ts': ''
        };
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    
    });
    
    
    
    it('should collect files added if they match the \'sources\' section of the given config', function () {
        
        fileSystemServiceMock.files = [
            
        ];
       
        fileSystemServiceMock.content = {};
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
      
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
          fileSystemServiceMock.content = {
          '/src/file1.ts': ''
        };
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.ADD,
            path: '/src/file1.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    
    });
    
    
    it('should collect referenced files from file added ', function () {
        
        fileSystemServiceMock.files = [
            
        ];
       
        fileSystemServiceMock.content = {};
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content = {
          '/src/file1.ts': 'import test = require("../other/file2")',
          '/other/file2.ts': '',
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.ADD,
            path: '/src/file1.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    
    });
    
    it('should collect files added if they are referenced by another file ', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file2")',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content['/other/file2.ts'] =  'something';
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.ADD,
            path: '/other/file2.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    
    });
    
    it('should remove files from project when they are deleted', function () {
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content =  {};
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.DELETE,
            path : '/src/file1.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should remove referenced files from the project when a source file referencing it is deleted', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/other/file2.ts',
            'file2.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file2")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content =  {};
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.DELETE,
            path: '/src/file1.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should remove referenced files from the project when a source file referencing it is deleted, ' + 
            'only if it is not referenced by another file', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/src/file2.ts',
            '/other/file3.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file3")',
            '/src/file2.ts': 'import test = require("../other/file3")',
            '/other/file3.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content =  {
            '/src/file2.ts': 'import test = require("../other/file3")',
            '/other/file3.ts' : ''
        };
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.DELETE,
            path: '/src/file1.ts'
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should remove a referenced files from the project when deleted', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/other/file2.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file2")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
         fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file2")'
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.DELETE,
                path: '/other/file2.ts'
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('recollect a referenced files from the project when deleted then readded', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/other/file2.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'import test = require("../other/file2")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.DELETE,
                path: '/other/file2.ts'
            }, {
                kind: fileSystem.FileChangeKind.ADD,
                path: '/other/file2.ts'
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should update project files when they change', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts'
        ];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'hello',
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.UPDATE,
                path : '/src/file1.ts'
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should collect a file reference when a file change', function () {
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/other/file2.ts'
        ];
        
        fileSystemServiceMock.content =  {
            '/src/file1.ts': 'import test = require("../other/file2")',
            '/other/file2.ts' : ''
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.UPDATE,
                path: '/src/file1.ts'
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should remove referenced files when a file change, and does not reference them anymore', function () {
        fileSystemServiceMock.files = [
            '/src/file1.ts',
            '/other/file2.ts'
        ];
        
        fileSystemServiceMock.content =  {
            '/src/file1.ts': 'import test = require("../other/file2")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
        
         fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.UPDATE,
                path: '/src/file1.ts'
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
    });
    
    
    it('should create a languageService host passing the CompilationSettings extracted from the config, and the files collected', function () {
         fileSystemServiceMock.files = [
            '/root/file1.ts',
            '/root/project/file2.ts',
            '/root/project/src/file3.ts',
            '/root/project/src/file4.ts',
            '/root/project/src/dir/file5.ts',
            '/root/project/src/dir/file6.other'
        ];
       
        fileSystemServiceMock.content = {
            '/root/file1.ts': '',
            '/root/project/src/file3.ts': '',
            '/root/project/src/file4.ts': '',
            '/root/project/src/dir/file5.ts': '',
        };
        createProject('/root/project/', {
            sources : [
                '../file1.ts',
                'src/**/*ts'
            ],
            compileOnSave: false,
            
            target: 'ES5',
            module: 'AMD',
            outDir: './bin/'
            
        });
        
        
        var compilationSettings = new TypeScript.CompilationSettings();
        compilationSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
        compilationSettings.outDirOption = './bin/';
        compilationSettings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
        
        expect(languageServiceHostFactory.calledOnce);
        expect(languageServiceHostFactory.args[0]).toEqual([compilationSettings, fileSystemServiceMock.content]);
        
    });
    
    
    it('should add the file to the languageService host when a file is added', function () {
        fileSystemServiceMock.files = [];
       
        fileSystemServiceMock.content = {};
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
      
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content = {
          '/src/file1.ts': ''
        };
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.ADD,
            path : '/src/file1.ts'
        }]);
        
        expect(addScriptSpy.calledOnce).toBe(true);
        expect(addScriptSpy.args[0]).toEqual(['/src/file1.ts', '']);
    });
    
    
    
    it('should remove the file from the languageService host when a file is deleted', function () {
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content =  {};
        
        
        fileSystemServiceMock.projectFilesChanged.dispatch([{
            kind: fileSystem.FileChangeKind.DELETE,
            path: '/src/file1.ts'
        }]);
        
        
        expect(removeScriptSpy.calledOnce).toBe(true);
        expect(removeScriptSpy.args[0]).toEqual(['/src/file1.ts']);
    });
    
    it('should update the file in the languageService host when a file is updated', function () {
        fileSystemServiceMock.files = ['/src/file1.ts'];
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(fileSystemServiceMock.content);
        
        fileSystemServiceMock.content = {
            '/src/file1.ts': 'hello',
        };
        
        fileSystemServiceMock.projectFilesChanged.dispatch([
            {
                kind: fileSystem.FileChangeKind.UPDATE,
                path: '/src/file1.ts'
            }
        ]);
        
        
        expect(updateScriptSpy.calledOnce).toBe(true);
        expect(updateScriptSpy.args[0]).toEqual(['/src/file1.ts', 'hello']);
    });
    
    
    it('should set to \'open\‘ every files in the workingSet', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts', '/src/file2.ts']
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
            '/src/file2.ts': ''
        };
        
        workingSetMock.files = ['/src/file1.ts', '/src/file2.ts']
        
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        
        
        expect(setScriptIsOpenSpy.calledTwice).toBe(true);
        expect(setScriptIsOpenSpy.args).toEqual([
            ['/src/file1.ts', true],
            ['/src/file2.ts', true]
        ]);
    });
    
    
    it('should set to \'open\‘ every files that are added to the workingSet', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts', '/src/file2.ts']
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
            '/src/file2.ts': ''
        };
        
        workingSetMock.files = [];
        
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(setScriptIsOpenSpy.called).toBe(false);
        workingSetMock.workingSetChanged.dispatch({
            kind: ws.WorkingSetChangeKind.ADD,
            paths: ['/src/file1.ts', '/src/file2.ts']
        });
        
        
        expect(setScriptIsOpenSpy.calledTwice).toBe(true);
        expect(setScriptIsOpenSpy.args).toEqual([
            ['/src/file1.ts', true],
            ['/src/file2.ts', true]
        ]);
    });
    
    
    it('should set to \'close\‘ every files that are removed from the workingSet', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts', '/src/file2.ts']
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': '',
            '/src/file2.ts': ''
        };
        
        workingSetMock.files = ['/src/file1.ts', '/src/file2.ts']
        
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        
        setScriptIsOpenSpy.reset();
        
        workingSetMock.workingSetChanged.dispatch({
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths: ['/src/file1.ts', '/src/file2.ts']
        });
        
        
        expect(setScriptIsOpenSpy.calledTwice).toBe(true);
        expect(setScriptIsOpenSpy.args).toEqual([
            ['/src/file1.ts', false],
            ['/src/file2.ts', false]
        ]);
    });
    
    
    it('should edit a script when a document corresponding to a project file\'s is edited', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts']
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': ''
        };
        
        workingSetMock.files = ['/src/file1.ts']
        
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        
        setScriptIsOpenSpy.reset();
        
        workingSetMock.documentEdited.dispatch([
            {
                path: '/src/file1.ts',
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
            }
        ]);
        
        
        expect(editScriptSpy.calledOnce).toBe(true);
        expect(editScriptSpy.args[0]).toEqual(['/src/file1.ts', 0, 0,  'console.log(\'hello world\')']);
    });
    
    
    it('should revert a file when a document have been closed without saving', function () {
        
        fileSystemServiceMock.files = ['/src/file1.ts']
       
        fileSystemServiceMock.content = {
            '/src/file1.ts': ''
        };
        
        workingSetMock.files = ['/src/file1.ts']
        
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        
        setScriptIsOpenSpy.reset();
        
        workingSetMock.documentEdited.dispatch([
            {
                path: '/src/file1.ts',
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
            }
        ]);
        
        workingSetMock.workingSetChanged.dispatch({
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths: ['/src/file1.ts', '/src/file2.ts']
        });
        
         expect(updateScriptSpy.calledOnce).toBe(true);
        expect(updateScriptSpy.args[0]).toEqual(['/src/file1.ts', '']);
    });
        
});