define(["require", "exports", './utils/signal'], function(require, exports, __signal__) {
    'use strict';

    var signal = __signal__;

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
                if (_this.isDirty) {
                    return;
                }

                if (!file) {
                    _this.reset();
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
                            _this.reset();
                        }
                        var oldFiles = {}, newFiles = {};

                        _this.filesPaths.forEach(function (path) {
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
                                    var newDir = newFiles[path];

                                    promises.push(_this.getDirectoryFiles(newDir).then(function (files) {
                                        files.forEach(function (file) {
                                            _this.filesPaths.push(file.fullPath);
                                            _this.files[file.fullPath] = newFiles[file.fullPath];
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

                        if (promises.length > 0) {
                            ($.when.apply($, promises)).then(function () {
                                if (changes.length > 0) {
                                    _this.projectFilesChanged.dispatch(changes);
                                }
                            }, function () {
                                _this.reset();
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

        FileSystem.prototype.getProjectFiles = function () {
            var _this = this;
            var deferred = $.Deferred();

            if (!this.isDirty) {
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
            if (!this.isDirty && this.files.hasOwnProperty(path)) {
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

        FileSystem.prototype.reset = function () {
            this.isDirty = true;
            this.files = null;
            this.filesPaths = null;
            this.projectFilesChanged.dispatch([
                {
                    kind: FileChangeKind.REFRESH
                }
            ]);
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
        return FileSystem;
    })();
    exports.FileSystem = FileSystem;
});
