'use strict';

import fileUtils = require('../main/utils/fileUtils');
import bracketsMock = require('./bracketsMock');




describe('FileSystemObserver', function () {
    
     var fileIndexManagerMock = new bracketsMock.FileIndexManagerMock(),
         projectManagerMock = new bracketsMock.ProjectManagerMock(),
         documentManagerMock = new bracketsMock.DocumentManagerMock()
    
    var observer: fileUtils.FileSystemObserver,
        spy: SinonSpy;
    
    beforeEach(function () {
        spy = sinon.spy();
        fileIndexManagerMock.fileInfos = [
            { 
                fullPath: '/path/file1',
                name: 'file1'
            }, {
                fullPath: '/path/file2',
                name: 'file2'
            }, {
                fullPath: '/path/file3',
                name: 'file3'
            },
        ];
        observer = new fileUtils.FileSystemObserver(projectManagerMock, documentManagerMock, fileIndexManagerMock);
        observer.add(spy);
    });
    
    afterEach(function () {
        if(observer) {
            observer.dispose();
        }
        fileIndexManagerMock.fileInfos = null;
    });
    
   
    it('should notify when a file is deleted', function() {
        fileIndexManagerMock.fileInfos = [
           {
                fullPath: '/path/file1',
                name: 'file1'
            }, {
                fullPath: '/path/file3',
                name: 'file3'
            },
        ]
        $(projectManagerMock).triggerHandler('projectFilesChange');
        expect(spy.called).toBe(true);
        expect(spy.args[0][0]).toEqual([{
            kind: fileUtils.FileChangeKind.DELETE,
            file: {
                fullPath: '/path/file2',
                name: 'file2'
            }
        }]);
     });
    
    it('should notify a change when a file is added', function() {
        fileIndexManagerMock.fileInfos = [
            { 
                fullPath: '/path/file1',
                name: 'file1'
            }, {
                fullPath: '/path/file2',
                name: 'file2'
            }, {
                fullPath: '/path/file3',
                name: 'file3'
            },{
                fullPath: '/path/file4',
                name: 'file4'
            },
        ]
        $(projectManagerMock).triggerHandler('projectFilesChange');
        expect(spy.called).toBe(true);
        expect(spy.args[0][0]).toEqual([{
            kind: fileUtils.FileChangeKind.ADD,
            file: {
                fullPath: '/path/file4',
                name: 'file4'
            }
        }]);
    });
    
      
    it('should notify a  refresh change when a projectFile are refreshed', function() {
        $(projectManagerMock).triggerHandler('projectRefresh');
        expect(spy.called).toBe(true);
        expect(spy.args[0][0]).toEqual([{
            kind: fileUtils.FileChangeKind.REFRESH
        }]);
    });
    
    function checkFileUpdateNotification() {
        expect(spy.called).toBe(true);
        expect(spy.args[0][0]).toEqual([{
            kind: fileUtils.FileChangeKind.UPDATE,
            file: {
                fullPath: '/path/file3',
                name: 'file3'
            }
        }]);
    }
  
    
    it('should notify a change when a file is updated, when DocumentManager dispatch \’documentSaved\’', function() {
        $(documentManagerMock).triggerHandler('documentSaved', {
            file: {
                isDirectory: false,
                isFile: true,
                fullPath: '/path/file3',
                name: 'file3'
            }
        });
        checkFileUpdateNotification();
    });
    
    it('should notify a change when a file is updated, when DocumentManager dispatch \’documentRefreshed\’', function() {
        $(documentManagerMock).triggerHandler('documentRefreshed', {
            file: {
                isDirectory: false,
                isFile: true,
                fullPath: '/path/file3',
                name: 'file3'
            }
        });
        checkFileUpdateNotification();
    });
});
