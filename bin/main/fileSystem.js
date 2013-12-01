define(["require", "exports", './utils/signal', './utils/collections'], function(require, exports, __signal__, __collections__) {
    'use strict';

    var signal = __signal__;
    var collections = __collections__;

    (function (FileChangeKind) {
        FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";

        FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";

        FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";

        FileChangeKind[FileChangeKind["RESET"] = 3] = "RESET";
    })(exports.FileChangeKind || (exports.FileChangeKind = {}));
    var FileChangeKind = exports.FileChangeKind;

    var FileSystem = (function () {
        function FileSystem(nativeFileSystem, projectManager) {
            var _this = this;
            this.nativeFileSystem = nativeFileSystem;
            this.projectManager = projectManager;
            this.filesContent = new collections.StringMap();
            this.filesPath = [];
            this.initialized = false;
            this.initializationStack = [];
            this._projectFilesChanged = new signal.Signal();
            this.changesHandler = function (event, file) {
                if (!file) {
                    var oldPathsSet = new collections.StringSet(), oldFilesContent = _this.filesContent.clone(), oldPaths = _this.filesPath.map(function (path) {
                        oldPathsSet.add(path);
                        return path;
                    });

                    _this.initialized = false;
                    _this.filesContent.clear();
                    _this.filesPath.length = 0;

                    _this.projectManager.getAllFiles().then(function (files) {
                        var fileAdded = [], fileDeleted = [], fileUpdated = [], newPathsSet = new collections.StringSet(), promises = [];

                        _this.filesPath = (files || []).map(function (file) {
                            if (!oldPathsSet.has(file.fullPath)) {
                                fileAdded.push(file.fullPath);
                            }
                            if (oldFilesContent.has(file.fullPath)) {
                                var deferred = $.Deferred();
                                promises.push(deferred.promise());
                                file.read({}, function (err, content) {
                                    if (!err) {
                                        _this.filesContent.set(file.fullPath, content);
                                    }
                                    if (err || content !== oldFilesContent.get(file.fullPath)) {
                                        fileUpdated.push(file.fullPath);
                                    }
                                    deferred.resolve();
                                });
                            }
                            newPathsSet.add(file.fullPath);
                            return file.fullPath;
                        });

                        oldPaths.forEach(function (path) {
                            if (!newPathsSet.has(path)) {
                                fileDeleted.push(path);
                            }
                        });

                        ($.when.apply($, promises)).then(function () {
                            var changes = fileDeleted.map(function (path) {
                                return {
                                    kind: FileChangeKind.DELETE,
                                    path: path
                                };
                            }).concat(fileAdded.map(function (path) {
                                return {
                                    kind: FileChangeKind.ADD,
                                    path: path
                                };
                            })).concat(fileUpdated.map(function (path) {
                                return {
                                    kind: FileChangeKind.UPDATE,
                                    path: path
                                };
                            }));

                            if (changes.length > 0) {
                                _this.projectFilesChanged.dispatch(changes);
                            }
                            _this.initialized = true;
                            _this.resolveInitializationStack();
                        });
                    }, function () {
                        _this.reset();
                    });
                } else if (file.isFile) {
                    var dispatchUpdate = function () {
                        _this.projectFilesChanged.dispatch([
                            {
                                kind: FileChangeKind.UPDATE,
                                path: file.fullPath
                            }
                        ]);
                    };

                    if (_this.filesContent.has(file.fullPath)) {
                        _this.filesContent.delete(file.fullPath);
                        _this.readFile(file.fullPath).then(function (content) {
                            _this.filesContent.set(file.fullPath, content);
                        }).always(dispatchUpdate);
                    } else {
                        dispatchUpdate();
                    }
                } else if (file.isDirectory) {
                    var directory = file, children;

                    directory.getContents(function (err, files) {
                        if (err) {
                            _this.reset();
                        }
                        var oldFiles = {}, newFiles = {};

                        _this.filesPath.forEach(function (path) {
                            var index = path.indexOf(directory.fullPath);
                            if (index !== -1) {
                                var index2 = path.indexOf('/', index + directory.fullPath.length);
                                if (index2 === -1) {
                                    oldFiles[path] = [path];
                                } else {
                                    var dirPath = path.substring(0, index2 + 1);
                                    if (!oldFiles[dirPath]) {
                                        oldFiles[dirPath] = [path];
                                    } else {
                                        oldFiles[dirPath].push(path);
                                    }
                                }
                            }
                        });

                        files.forEach(function (file) {
                            newFiles[file.fullPath] = file;
                        });

                        var changes = [];
                        for (var path in oldFiles) {
                            if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path)) {
                                oldFiles[path].forEach(function (path) {
                                    var index = _this.filesPath.indexOf(path);
                                    if (index !== -1) {
                                        _this.filesPath.splice(index, 1);
                                        _this.filesContent.delete(path);
                                        changes.push({
                                            kind: FileChangeKind.DELETE,
                                            path: path
                                        });
                                    }
                                });
                            }
                        }

                        var promises = [];
                        for (var path in newFiles) {
                            if (newFiles.hasOwnProperty(path) && !oldFiles.hasOwnProperty(path)) {
                                if (newFiles[path].isFile) {
                                    _this.filesPath.push(path);
                                    changes.push({
                                        kind: FileChangeKind.ADD,
                                        path: path
                                    });
                                } else {
                                    var newDir = newFiles[path];

                                    promises.push(_this.getDirectoryFiles(newDir).then(function (files) {
                                        files.forEach(function (file) {
                                            _this.filesPath.push(file.fullPath);
                                            changes.push({
                                                kind: FileChangeKind.ADD,
                                                path: file.fullPath
                                            });
                                        });
                                    }));
                                }
                            }
                        }
                        ;

                        ($.when.apply($, promises)).then(function () {
                            if (changes.length > 0) {
                                _this.projectFilesChanged.dispatch(changes);
                            }
                        }, function () {
                            _this.reset();
                        });
                    });
                }
            };
            nativeFileSystem.on('change', this.changesHandler);
            this.init();
        }
        Object.defineProperty(FileSystem.prototype, "projectFilesChanged", {
            get: function () {
                return this._projectFilesChanged;
            },
            enumerable: true,
            configurable: true
        });

        FileSystem.prototype.getProjectFiles = function () {
            var _this = this;
            var deferred = $.Deferred();
            this.addToInitializatioStack(function () {
                return deferred.resolve(_this.filesPath);
            });
            return deferred.promise();
        };

        FileSystem.prototype.readFile = function (path) {
            var _this = this;
            var result = $.Deferred();
            this.addToInitializatioStack(function () {
                if (_this.filesContent.has(path)) {
                    result.resolve(_this.filesContent.get(path));
                } else {
                    var file = _this.nativeFileSystem.getFileForPath(path);
                    file.read({}, function (err, content) {
                        if (err) {
                            result.reject(err);
                        } else {
                            content = content && _this.normalizeText(content);
                            _this.filesContent.set(path, content);
                            result.resolve(content);
                        }
                    });
                }
            });
            return result.promise();
        };

        FileSystem.prototype.reset = function () {
            this.initialized = false;
            this.filesContent.clear();
            this.filesPath.length = 0;
            this.init();
            this._projectFilesChanged.dispatch([
                {
                    kind: FileChangeKind.RESET
                }
            ]);
        };

        FileSystem.prototype.dispose = function () {
            this.nativeFileSystem.off('change', this.changesHandler);
            this._projectFilesChanged.clear();
        };

        FileSystem.prototype.init = function () {
            var _this = this;
            this.projectManager.getAllFiles().then(function (files) {
                _this.filesPath = files ? files.map(function (file) {
                    return file.fullPath;
                }) : [];
                _this.initialized = true;
                _this.resolveInitializationStack();
            });
        };

        FileSystem.prototype.addToInitializatioStack = function (callback) {
            if (this.initialized) {
                callback();
            } else {
                this.initializationStack.push(callback);
            }
        };

        FileSystem.prototype.resolveInitializationStack = function () {
            this.initializationStack.forEach(function (callback) {
                return callback();
            });
            this.initializationStack.length = 0;
        };

        FileSystem.prototype.getDirectoryFiles = function (directory) {
            var deferred = $.Deferred(), files = [];

            directory.visit(function (entry) {
                if (entry.isFile) {
                    files.push(entry);
                }
                return true;
            }, {}, function (err) {
                deferred.resolve(files);
            });
            return deferred.promise();
        };

        FileSystem.prototype.normalizeText = function (text) {
            return text.replace(/\r\n/g, "\n");
        };
        return FileSystem;
    })();
    exports.FileSystem = FileSystem;
});
