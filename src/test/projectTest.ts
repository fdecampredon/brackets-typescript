import project = require('../main/project');
import fileUtils = require('../main/utils/fileUtils');
import signal = require('../main/utils/signal');
import language = require('../main/typescript/language');
import bracketsMock = require('./bracketsMock');

class FileSystemObserverMock extends signal.Signal<fileUtils.ChangeRecord[]> {
    dispose() {
    }
}

describe('TypeScriptProject', function () {
    
    var typeScriptProject: project.TypeScriptProject,
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
        },
        addScriptSpy = sinon.spy(),
        updateScriptSpy = sinon.spy(),
        removeScriptSpy = sinon.spy(),
        languageServiceHostMock: language.ILanguageServiceHost = <any> {
            addScript: addScriptSpy,
            updateScript: updateScriptSpy,
            removeScript: removeScriptSpy
        },
        languageServiceHostFactory = sinon.spy(() => {
            return languageServiceHostMock
        });
 
    

    function createProject(baseDir: string, config: project.TypeScriptProjectConfig) {
        typeScriptProject = new project.TypeScriptProject(
            baseDir, 
            $.extend({}, project.typeScriptProjectConfigDefault, config),
            fileInfosResolver, 
            fileSystemObserver, 
            reader,
            languageServiceHostFactory
        );
    };
    
    afterEach(function () {
        if (typeScriptProject) {
            typeScriptProject.dispose();
            typeScriptProject = null;
        }
        languageServiceHostFactory.reset();
        addScriptSpy.reset();
        removeScriptSpy.reset();
    });
    
    it('should collect every  files in the file system corresponding to the \'sources\' section of the given config', function () {
         
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/root/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/root/project/file2.ts',
                name : 'file2.ts'
            }, {
                fullPath : '/root/project/src/file3.ts',
                name : 'file3.ts'
            }, {
                fullPath : '/root/project/src/file4.ts',
                name : 'file4.ts'
            }, {
                fullPath : '/root/project/src/dir/file5.ts',
                name : 'file5.ts'
            }, {
                fullPath : '/root/project/src/dir/file6.other',
                name : 'file6.other'
            }
        ];
       
        content = {
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
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    it('should collect files that in sources', function () {
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath :'/src/file2.ts',
                name : 'file2.ts'
            },
            {
                fullPath : '/other/file3.ts',
                name : 'file3.ts'
            }, {
                fullPath :'/other/file4.ts',
                name : 'file4.ts'
            }, {
                fullPath :'/other/file5.ts',
                name : 'file5.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file3.ts")',
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
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    
    });
    
    
    
    it('should collect files added if they match the \'sources\' section of the given config', function () {
        
        fileIndexManagerMock.fileInfos = [
            
        ];
       
        content = {};
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
      
        expect(typeScriptProject.getFiles()).toEqual(content);
        
          content = {
          '/src/file1.ts': ''
        };
        
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.ADD,
            file: {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    
    });
    
    
    it('should collect referenced files from file added ', function () {
        
        fileIndexManagerMock.fileInfos = [
            
        ];
       
        content = {};
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
         expect(typeScriptProject.getFiles()).toEqual(content);
        
        content = {
          '/src/file1.ts': 'import test = require("../other/file2.ts")',
          '/other/file2.ts': '',
        };
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.ADD,
            file: {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    
    });
    
    it('should collect files added if they are referenced by another file ', function () {
        
        fileIndexManagerMock.fileInfos = [{
            fullPath : '/src/file1.ts',
            name : 'file1.ts'
        }];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        content['/other/file2.ts'] =  'something';
        
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.ADD,
            file: {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    
    });
    
    it('should remove files from project when they are deleted', function () {
        fileIndexManagerMock.fileInfos = [{
            fullPath : '/src/file1.ts',
            name : 'file1.ts'
        }];
       
        content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        content =  {};
        
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.DELETE,
            file: {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should remove referenced files from the project when a source file referencing it is deleted', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        content =  {};
        
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.DELETE,
            file: {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should remove referenced files from the project when a source file referencing it is deleted, ' + 
            'only if it is not referenced by another file', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/src/file2.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file3.ts',
                name : 'file3.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file3.ts")',
            '/src/file2.ts': 'import test = require("../other/file3.ts")',
            '/other/file3.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        content =  {
            '/src/file2.ts': 'import test = require("../other/file3.ts")',
            '/other/file3.ts' : ''
        };
        
        
        fileSystemObserver.dispatch([{
            kind: fileUtils.FileChangeKind.DELETE,
            file: {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        }]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should remove a referenced files from the project when deleted', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
         content = {
            '/src/file1.ts': 'import test = require("../other/file2.ts")'
        };
        
        fileSystemObserver.dispatch([
            {
                kind: fileUtils.FileChangeKind.DELETE,
                file: {
                    fullPath : '/other/file2.ts',
                    name : 'file2.ts'
                }
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('recollect a referenced files from the project when deleted then readded', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        fileSystemObserver.dispatch([
            {
                kind: fileUtils.FileChangeKind.DELETE,
                file: {
                    fullPath : '/other/file2.ts',
                    name : 'file2.ts'
                }
            }, {
                kind: fileUtils.FileChangeKind.ADD,
                file: {
                    fullPath : '/other/file2.ts',
                    name : 'file2.ts'
                }
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should update project files when they change', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        content = {
            '/src/file1.ts': 'hello',
        };
        
        fileSystemObserver.dispatch([
            {
                kind: fileUtils.FileChangeKind.UPDATE,
                file:  {
                    fullPath : '/src/file1.ts',
                    name : 'file1.ts'
                }
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should collect a file reference when a file change', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': '',
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        ];
        
        content =  {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
            '/other/file2.ts' : ''
        };
        
        fileSystemObserver.dispatch([
            {
                kind: fileUtils.FileChangeKind.UPDATE,
                file:  {
                    fullPath : '/src/file1.ts',
                    name : 'file1.ts'
                }
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should remove referenced files when a file change, and does not reference them anymore', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/other/file2.ts',
                name : 'file2.ts'
            }
        ];
        
        content =  {
            '/src/file1.ts': 'import test = require("../other/file2.ts")',
            '/other/file2.ts' : ''
        };
          
        createProject('/', {
            sources : [
                'src/**/*ts'
            ]
        });
        
        expect(typeScriptProject.getFiles()).toEqual(content);
        
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/src/file1.ts',
                name : 'file1.ts'
            }
        ];
       
        content = {
            '/src/file1.ts': '',
        };
        
        fileSystemObserver.dispatch([
            {
                kind: fileUtils.FileChangeKind.UPDATE,
                file:  {
                    fullPath : '/src/file1.ts',
                    name : 'file1.ts'
                }
            }
        ]);
        
        expect(typeScriptProject.getFiles()).toEqual(content);
    });
    
    
    it('should create a languageService host passing the CompilationSettings extracted from the config, and the files collected', function () {
        fileIndexManagerMock.fileInfos = [
            {
                fullPath : '/root/file1.ts',
                name : 'file1.ts'
            }, {
                fullPath : '/root/project/file2.ts',
                name : 'file2.ts'
            }, {
                fullPath : '/root/project/src/file3.ts',
                name : 'file3.ts'
            }, {
                fullPath : '/root/project/src/file4.ts',
                name : 'file4.ts'
            }, {
                fullPath : '/root/project/src/dir/file5.ts',
                name : 'file5.ts'
            }, {
                fullPath : '/root/project/src/dir/file6.other',
                name : 'file6.other'
            }
        ];
       
        content = {
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
        expect(languageServiceHostFactory.args[0]).toEqual([compilationSettings, content]);
        
    });
        
});