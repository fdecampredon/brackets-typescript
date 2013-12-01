import project = require('../main/project');
import fileSystem = require('../main/fileSystem');
import ws = require('../main/workingSet');
import language = require('../main/typescript/language');
import FileSystemMock = require('./fileSystemMock');
import WorkingSetMock = require('./workingSetMock');

describe('TypeScriptProject', function () {
 
    it('should collect every  files in the file system corresponding to the \'sources\' section of the given config', function () {
        
    });
    
    it('should collect files that in sources', function () {
        
       
    });
    
    it('should collect files added if they match the \'sources\' section of the given config', function () {
    
    });
    
    
    it('should collect referenced files from file added ', function () {
        
      
    });
    
    it('should collect files added if they are referenced by another file ', function () {
        
    
    });
    
    it('should remove files from project when they are deleted', function () {
        
    });
    
    it('should remove referenced files from the project when a source file referencing it is deleted', function () {
       
    });
    
    
    it('should remove referenced files from the project when a source file referencing it is deleted, ' + 
            'only if it is not referenced by another file', function () {
       
    });
    
    
    it('should remove a referenced files from the project when deleted', function () {
     
    });
    
    
    it('recollect a referenced files from the project when deleted then readded', function () {
      
    });
    
    
    it('should update project files when they change', function () {
    
    });
    
    
    it('should collect a file reference when a file change', function () {
      
    });
    
    
    it('should remove referenced files when a file change, and does not reference them anymore', function () {
     
    });
    
    
    it('should create a languageService host passing the CompilationSettings extracted from the config, and the files collected', function () {
         
        
    });
    
    
    it('should add the file to the languageService host when a file is added', function () {
        
    });
    
    
    
    it('should remove the file from the languageService host when a file is deleted', function () {
       
    });
    
    it('should update the file in the languageService host when a file is updated', function () {
     
    });
    
    
    it('should set to \'open\‘ every files in the workingSet', function () {
       
    });
    
    
    it('should set to \'open\‘ every files that are added to the workingSet', function () {
      
    });
    
    
    it('should set to \'close\‘ every files that are removed from the workingSet', function () {
        
      
    });
    
    
    it('should edit a script when a document corresponding to a project file\'s is edited', function () {
        
      
    });
    
    
    it('should revert a file when a document have been closed without saving', function () {
       
    });
        
});