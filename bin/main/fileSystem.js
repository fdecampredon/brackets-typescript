define(["require", "exports", './utils/signal'], function(require, exports, __signal__) {
    'use strict';

    var signal = __signal__;

    (function (FileSystemError) {
        FileSystemError[FileSystemError["FILE_NOT_FOUND"] = 0] = "FILE_NOT_FOUND";
    })(exports.FileSystemError || (exports.FileSystemError = {}));
    var FileSystemError = exports.FileSystemError;

    (function (FileChangeKind) {
        FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";

        FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";

        FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";

        FileChangeKind[FileChangeKind["REFRESH"] = 3] = "REFRESH";
    })(exports.FileChangeKind || (exports.FileChangeKind = {}));
    var FileChangeKind = exports.FileChangeKind;

    var FileSystem = (function () {
        function FileSystem(nativeFileSystem, projectManager) {
            var _this = this;
            this.nativeFileSystem = nativeFileSystem;
            this.projectManager = projectManager;
            this.isDirty = true;
            this.changesHandler = function (file) {
                if (!file) {
                    _this.isDirty = true;
                    _this.projectFilesChanged.dispatch([
                        {
                            kind: FileChangeKind.REFRESH
                        }
                    ]);
                } else if (file.isFile) {
                    _this.projectFilesChanged.dispatch([
                        {
                            kind: FileChangeKind.UPDATE,
                            path: file.fullPath
                        }
                    ]);
                } else if (file.isDirectory) {
                    var directory = file, children;
                    directory.getContents(function (err, files) {
                        if (err) {
                            _this.isDirty = true;
                            _this.projectFilesChanged.dispatch([
                                {
                                    kind: FileChangeKind.REFRESH
                                }
                            ]);
                            return;
                        }
                        var oldFiles = {}, newFiles = {};
                        _this.filesPaths.forEach(function (path) {
                            var index = path.indexOf(directory.fullPath);
                            if (index !== -1) {
                                var index2 = path.indexOf('/', index);
                                if (index2 = -1) {
                                    oldFiles[path] = [path];
                                } else {
                                    var dirPath = path.substring(0, index2);
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

                        var changes;
                        for (var path in oldFiles) {
                            if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path)) {
                                oldFiles[path].forEach(function (path) {
                                    var index = _this.filesPaths.indexOf(path);
                                    if (index !== -1) {
                                        _this.filesPaths.splice(index, 1);
                                        delete _this.files[path];
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
                                    _this.filesPaths.push(path);
                                    _this.files[path] = newFiles[path];
                                    changes.push({
                                        kind: FileChangeKind.ADD,
                                        path: path
                                    });
                                } else {
                                    var directory = newFiles[path];
                                    promises.push(_this.getDirectoryFiles(directory).then(function (files) {
                                        files.forEach(function (file) {
                                            _this.filesPaths.push(path);
                                            _this.files[path] = newFiles[path];
                                            changes.push({
                                                kind: FileChangeKind.ADD,
                                                path: path
                                            });
                                        });
                                    }));
                                }
                            }
                        }
                        ;
                        if (promises.length > 0) {
                            ($.when.apply($, promises)).then(function () {
                                if (changes.length > 0) {
                                    _this.projectFilesChanged.dispatch(changes);
                                }
                            });
                        } else if (changes.length > 0) {
                            _this.projectFilesChanged.dispatch(changes);
                        }
                    });
                }
            };
            this._projectFilesChanged = new signal.Signal();
            nativeFileSystem.on('change', this.changesHandler);
        }
        Object.defineProperty(FileSystem.prototype, "projectFilesChanged", {
            get: function () {
                return this._projectFilesChanged;
            },
            enumerable: true,
            configurable: true
        });

        FileSystem.prototype.getProjectFiles = function (forceRefresh) {
            if (typeof forceRefresh === "undefined") { forceRefresh = false; }
            var _this = this;
            var deferred = $.Deferred();

            if (!forceRefresh && !this.isDirty) {
                deferred.resolve(this.filesPaths);
            } else {
                this.projectManager.getAllFiles().then(function (files) {
                    if (!files) {
                        files = [];
                    }
                    _this.files = {};
                    _this.filesPaths = files.map(function (file) {
                        _this.files[file.fullPath] = file;
                        return file.fullPath;
                    });
                    _this.isDirty = false;
                    deferred.resolve(_this.filesPaths);
                });
            }

            return deferred.promise();
        };

        FileSystem.prototype.readFile = function (path) {
            var result = $.Deferred(), file;
            if (this.files.hasOwnProperty(path)) {
                file = this.files[path];
            } else {
                file = this.nativeFileSystem.getFileForPath(path);
            }

            file.read({}, function (err, content) {
                if (err) {
                    result.reject(err);
                } else {
                    result.resolve(content);
                }
            });

            return result.promise();
        };

        FileSystem.prototype.dispose = function () {
            this.nativeFileSystem.off('change', this.changesHandler);
            this._projectFilesChanged.clear();
        };

        FileSystem.prototype.getDirectoryFiles = function (directory) {
            var deferred = $.Deferred(), files;

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
        return FileSystem;
    })();
    exports.FileSystem = FileSystem;

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
});
