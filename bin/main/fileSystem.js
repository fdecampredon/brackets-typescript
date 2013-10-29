var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", './utils/signal'], function(require, exports, __signal__) {
    'use strict';

    var signal = __signal__;

    var FileSystemService = (function () {
        function FileSystemService(projectManager, documentManager, fileIndexManager, fileUtils) {
            var _this = this;
            this.projectFilesChangedsHandler = function (records) {
                records.forEach(function (record) {
                    switch (record.kind) {
                        case FileChangeKind.ADD:
                            _this.files.push(record.path);
                            break;
                        case FileChangeKind.DELETE:
                            var index = _this.files.indexOf(record.path);
                            if (index !== -1) {
                                _this.files.splice(index, 1);
                            }
                            break;
                    }
                });
            };
            this.projectManager = projectManager;
            this.documentManager = documentManager;
            this.fileIndexManager = fileIndexManager;
            this.fileUtils = fileUtils;

            this._projectFilesChanged = new FileSystemObserver($(projectManager), $(documentManager), function () {
                return _this.getProjectFiles(true);
            });
            this._projectFilesChanged.add(this.projectFilesChangedsHandler);
        }
        Object.defineProperty(FileSystemService.prototype, "projectFilesChanged", {
            get: function () {
                return this._projectFilesChanged;
            },
            enumerable: true,
            configurable: true
        });

        FileSystemService.prototype.getProjectFiles = function (forceRefresh) {
            if (typeof forceRefresh === "undefined") { forceRefresh = false; }
            var _this = this;
            var deferred = $.Deferred();
            var result = deferred.promise();

            if (this.files && !forceRefresh) {
                deferred.resolve(this.files);
            } else {
                this.fileIndexManager.getFileInfoList('all').then(function (files) {
                    _this.files = files.map(function (fileInfo) {
                        return fileInfo.fullPath;
                    });
                    deferred.resolve(_this.files);
                });
            }

            return result;
        };

        FileSystemService.prototype.readFile = function (path) {
            var _this = this;
            var result = $.Deferred();
            this.projectManager.getProjectRoot().getFile(path, { create: false }, function (fileEntry) {
                _this.fileUtils.readAsText(fileEntry).then(function (content) {
                    result.resolve(content);
                }, function () {
                    result.reject.apply(result, arguments);
                });
            }, function () {
                result.reject.call(result, path, arguments);
            });
            return result.promise();
        };

        FileSystemService.prototype.dispose = function () {
            this._projectFilesChanged.dispose();
        };
        return FileSystemService;
    })();
    exports.FileSystemService = FileSystemService;

    (function (FileChangeKind) {
        FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";
        FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";
        FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";
        FileChangeKind[FileChangeKind["REFRESH"] = 3] = "REFRESH";
    })(exports.FileChangeKind || (exports.FileChangeKind = {}));
    var FileChangeKind = exports.FileChangeKind;

    var uidHelper = 0;

    var StringSet = (function () {
        function StringSet() {
            this.map = Object.create(null);
        }
        StringSet.prototype.add = function (value) {
            this.map[value] = true;
        };

        StringSet.prototype.remove = function (value) {
            return delete this.map[value];
        };

        StringSet.prototype.has = function (value) {
            return this.map[value];
        };

        StringSet.prototype.forEach = function (callback) {
            return Object.keys(this.map).forEach(callback);
        };
        return StringSet;
    })();

    var FileSystemObserver = (function (_super) {
        __extends(FileSystemObserver, _super);
        function FileSystemObserver(projectManager, documentManager, projectFilesResolver) {
            var _this = this;
            _super.call(this);
            this.namespace = '.fileSystemObserver' + (uidHelper++);
            this.projectManager = projectManager;
            this.documentManager = documentManager;
            this.projectFilesResolver = projectFilesResolver;
            this.refresh().then(function (p) {
                return _this.addListeners();
            });
        }
        FileSystemObserver.prototype.dispose = function () {
            this.projectManager.off(this.namespace);
            this.documentManager.off(this.namespace);
        };

        FileSystemObserver.prototype.refresh = function () {
            this.fileSet = new StringSet();
            return this.collectFiles();
        };

        FileSystemObserver.prototype.collectFiles = function () {
            var _this = this;
            return this.projectFilesResolver().then(function (files) {
                for (var i = 0, l = files.length; i < l; i++) {
                    _this.fileSet.add(files[i]);
                }
                return;
            });
        };

        FileSystemObserver.prototype.addListeners = function () {
            var _this = this;
            this.projectManager.on('projectFilesChange' + this.namespace, function () {
                _this.compareAndUpdate();
            });

            this.projectManager.on('projectRefresh' + this.namespace, function () {
                _this.refresh();
                _this.dispatch([{ kind: FileChangeKind.REFRESH }]);
            });

            this.documentManager.on('documentSaved' + this.namespace, function (event, document) {
                _this.documentChangesHandler(document);
            });

            this.documentManager.on('documentRefreshed' + this.namespace, function (event, document) {
                _this.documentChangesHandler(document);
            });
        };

        FileSystemObserver.prototype.compareAndUpdate = function () {
            var _this = this;
            var oldFileSet = this.fileSet;
            this.fileSet = new StringSet();
            this.collectFiles().then(function () {
                var changes = [], path;

                oldFileSet.forEach(function (path) {
                    if (!_this.fileSet.has(path)) {
                        changes.push({
                            kind: FileChangeKind.DELETE,
                            path: path
                        });
                    }
                });

                _this.fileSet.forEach(function (path) {
                    if (!oldFileSet.has(path)) {
                        changes.push({
                            kind: FileChangeKind.ADD,
                            path: path
                        });
                    }
                });

                if (changes.length > 0) {
                    _this.dispatch(changes);
                }
            });
        };

        FileSystemObserver.prototype.documentChangesHandler = function (document) {
            this.dispatch([
                {
                    kind: FileChangeKind.UPDATE,
                    path: document.file.fullPath
                }
            ]);
        };
        return FileSystemObserver;
    })(signal.Signal);
});
