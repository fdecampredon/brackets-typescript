var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", './signal'], function(require, exports, __signal__) {
    'use strict';

    var signal = __signal__;

    (function (FileChangeKind) {
        FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";
        FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";
        FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";
        FileChangeKind[FileChangeKind["REFRESH"] = 3] = "REFRESH";
    })(exports.FileChangeKind || (exports.FileChangeKind = {}));
    var FileChangeKind = exports.FileChangeKind;

    var uidHelper = 0;

    var FileSystemObserver = (function (_super) {
        __extends(FileSystemObserver, _super);
        function FileSystemObserver(projectManager, documentManager, fileIndexManager) {
            _super.call(this);
            this.uid = 'FileSystemObserver$' + (uidHelper++);
            this.projectManager = projectManager;
            this.documentManager = documentManager;
            this.fileIndexManager = fileIndexManager;
            this.refresh();
            this.addListeners();
        }
        FileSystemObserver.prototype.dispose = function () {
            $(this.projectManager).off('.' + this.uid);
            $(this.documentManager).off('.' + this.uid);
        };

        FileSystemObserver.prototype.refresh = function () {
            var deferred = $.Deferred();
            this.fileMap = {};
            this.initialized = deferred.promise();
            this.getFilesFromIndex().then(function () {
                deferred.resolve();
            }, function () {
                deferred.reject(arguments);
            });
        };

        FileSystemObserver.prototype.getFilesFromIndex = function () {
            var _this = this;
            return this.fileIndexManager.getFileInfoList('all').then(function (files) {
                _this.files = files;
                for (var i = 0, l = _this.files.length; i < l; i++) {
                    _this.fileMap[_this.files[i].fullPath] = _this.files[i];
                }
            });
        };

        FileSystemObserver.prototype.addListeners = function () {
            var _this = this;
            $(this.projectManager).on('projectFilesChange.' + this.uid, function () {
                _this.compareAndUpdate();
            });
            $(this.projectManager).on('projectRefresh.' + this.uid, function () {
                _this.refresh();
                _this.dispatch([{ kind: FileChangeKind.REFRESH }]);
            });

            $(this.documentManager).on('documentSaved.' + this.uid, function (event, document) {
                _this.documentChangesHandler(document);
            });
            $(this.documentManager).on('documentRefreshed.' + this.uid, function (event, document) {
                _this.documentChangesHandler(document);
            });
        };

        FileSystemObserver.prototype.compareAndUpdate = function () {
            var _this = this;
            this.initialized.then(function () {
                var oldFileMap = _this.fileMap;
                _this.fileMap = {};
                _this.getFilesFromIndex().then(function () {
                    var changes = [], path;
                    for (path in oldFileMap) {
                        if (oldFileMap.hasOwnProperty(path) && !_this.fileMap.hasOwnProperty(path)) {
                            changes.push({
                                kind: FileChangeKind.DELETE,
                                file: oldFileMap[path]
                            });
                        }
                    }

                    for (path in _this.fileMap) {
                        if (_this.fileMap.hasOwnProperty(path)) {
                            if (_this.fileMap.hasOwnProperty(path) && !oldFileMap.hasOwnProperty(path)) {
                                changes.push({
                                    kind: FileChangeKind.ADD,
                                    file: _this.fileMap[path]
                                });
                            }
                        }
                    }

                    if (changes.length > 0) {
                        _this.dispatch(changes);
                    }
                });
            });
        };

        FileSystemObserver.prototype.documentChangesHandler = function (document) {
            var path = document.file.fullPath;
            this.dispatch([
                {
                    kind: FileChangeKind.UPDATE,
                    file: this.fileMap[path]
                }
            ]);
        };
        return FileSystemObserver;
    })(signal.Signal);
    exports.FileSystemObserver = FileSystemObserver;

    function readFile(path) {
        var FileUtils = brackets.getModule('file/FileUtils'), ProjectManager = brackets.getModule('project/ProjectManager'), result = $.Deferred();

        ProjectManager.getProjectRoot().getFile(path, { create: false }, function (fileEntry) {
            FileUtils.readAsText(fileEntry).then(function (text, lastUpdateDate) {
                result.resolve({
                    path: path,
                    content: text,
                    lastUpdateDate: lastUpdateDate
                });
            }, function () {
                result.reject(arguments);
            });
        });
        return result.promise();
    }
    exports.readFile = readFile;
});
