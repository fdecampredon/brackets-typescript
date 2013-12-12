'use strict';
define(["require", "exports", './utils/signal', './utils/collections'], function(require, exports, signal, collections) {
    

    //--------------------------------------------------------------------------
    //
    //  Change record
    //
    //--------------------------------------------------------------------------
    /**
    * enum representing the kind change possible in the fileSysem
    */
    (function (FileChangeKind) {
        /**
        * a file has been added
        */
        FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";

        /**
        * a file has been updated
        */
        FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";

        /**
        * a file has been deleted
        */
        FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";

        /**
        * the project files has been reset
        */
        FileChangeKind[FileChangeKind["RESET"] = 3] = "RESET";
    })(exports.FileChangeKind || (exports.FileChangeKind = {}));
    var FileChangeKind = exports.FileChangeKind;

    

    

    

    /**
    * IFileSystem implementations
    */
    var FileSystem = (function () {
        //-------------------------------
        //  constructor
        //-------------------------------
        function FileSystem(nativeFileSystem, projectManager) {
            var _this = this;
            this.nativeFileSystem = nativeFileSystem;
            this.projectManager = projectManager;
            //-------------------------------
            //  Variables
            //-------------------------------
            /**
            * map path to native files
            */
            this.filesContent = new collections.StringMap();
            /**
            * cache of the paths list
            */
            this.filesPath = [];
            /**
            * boolean containing the initialization state of the wrapper
            */
            this.initialized = false;
            /**
            * a stack containing all the call that have been performed before initiliazation
            */
            this.initializationStack = [];
            this._projectFilesChanged = new signal.Signal();
            //-------------------------------
            //  Events handler
            //-------------------------------
            /**
            * handle project workspaces changes
            */
            this.changesHandler = function (event, file) {
                if (!file) {
                    // a refresh event
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

                        $.when.apply($, promises).then(function () {
                            var changes = [];

                            fileDeleted.forEach(function (path) {
                                changes.push({
                                    kind: 2 /* DELETE */,
                                    path: path
                                });
                            });

                            fileAdded.forEach(function (path) {
                                changes.push({
                                    kind: 0 /* ADD */,
                                    path: path
                                });
                            });

                            fileUpdated.forEach(function (path) {
                                changes.push({
                                    kind: 1 /* UPDATE */,
                                    path: path
                                });
                            });

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
                    //file have been updated simply dispatch an update event and update the cache if necessary
                    var dispatchUpdate = function () {
                        _this.projectFilesChanged.dispatch([{
                                kind: 1 /* UPDATE */,
                                path: file.fullPath
                            }]);
                    };

                    if (_this.filesContent.has(file.fullPath)) {
                        // if the file content has been cached update the cache
                        _this.filesContent.delete(file.fullPath);
                        _this.readFile(file.fullPath).then(function (content) {
                            _this.filesContent.set(file.fullPath, content);
                        }).always(dispatchUpdate);
                    } else {
                        dispatchUpdate();
                    }
                } else if (file.isDirectory) {
                    // a directory content has been changed need to make diff between cache an directory
                    var directory = file, children;

                    directory.getContents(function (err, files) {
                        if (err) {
                            // an err occured reset
                            _this.reset();
                        }
                        var oldFiles = {}, newFiles = {};

                        //collect all the paths in the cache
                        _this.filesPath.forEach(function (path) {
                            var index = path.indexOf(directory.fullPath);
                            if (index !== -1) {
                                var index2 = path.indexOf('/', index + directory.fullPath.length);
                                if (index2 === -1) {
                                    oldFiles[path] = [path];
                                } else {
                                    //in case of subdir regroup the files by subdir
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
                                //for each files that has been deleted add a DELETE record
                                oldFiles[path].forEach(function (path) {
                                    var index = _this.filesPath.indexOf(path);
                                    if (index !== -1) {
                                        _this.filesPath.splice(index, 1);
                                        _this.filesContent.delete(path);
                                        changes.push({
                                            kind: 2 /* DELETE */,
                                            path: path
                                        });
                                    }
                                });
                            }
                        }

                        var promises = [];
                        for (var path in newFiles) {
                            if (newFiles.hasOwnProperty(path) && !oldFiles.hasOwnProperty(path)) {
                                //if a file has been added just add a ADD record
                                if (newFiles[path].isFile) {
                                    _this.filesPath.push(path);
                                    changes.push({
                                        kind: 0 /* ADD */,
                                        path: path
                                    });
                                } else {
                                    var newDir = newFiles[path];

                                    //if a dir has been added collect each files in this directory then for each one add an 'ADD' record
                                    promises.push(_this.getDirectoryFiles(newDir).then(function (files) {
                                        files.forEach(function (file) {
                                            _this.filesPath.push(file.fullPath);
                                            changes.push({
                                                kind: 0 /* ADD */,
                                                path: file.fullPath
                                            });
                                        });
                                    }));
                                }
                            }
                        }
                        ;

                        $.when.apply($, promises).then(function () {
                            if (changes.length > 0) {
                                _this.projectFilesChanged.dispatch(changes);
                            }
                        }, function () {
                            //in case of error reset
                            _this.reset();
                        });
                    });
                }
            };
            nativeFileSystem.on('change', this.changesHandler);
            this.init();
        }
        Object.defineProperty(FileSystem.prototype, "projectFilesChanged", {
            //-------------------------------
            //  IFileSystem implementation
            //-------------------------------
            /**
            * @see IFileSystem.projectFilesChanged
            */
            get: function () {
                return this._projectFilesChanged;
            },
            enumerable: true,
            configurable: true
        });

        /**
        * @see IFileSystem.getProjectFiles
        */
        FileSystem.prototype.getProjectFiles = function () {
            var _this = this;
            var deferred = $.Deferred();
            this.addToInitializatioStack(function () {
                return deferred.resolve(_this.filesPath);
            });
            return deferred.promise();
        };

        /**
        * @see IFileSystem.readFile
        */
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

        /**
        * @see IFileSystem.reset
        */
        FileSystem.prototype.reset = function () {
            this.initialized = false;
            this.filesContent.clear();
            this.filesPath.length = 0;
            this.init();
            this._projectFilesChanged.dispatch([{
                    kind: 3 /* RESET */
                }]);
        };

        /**
        * @see IFileSystem.dispose
        */
        FileSystem.prototype.dispose = function () {
            this.nativeFileSystem.off('change', this.changesHandler);
            this._projectFilesChanged.clear();
        };

        //-------------------------------
        //  privates methods
        //-------------------------------
        /**
        * initialize the wrapper
        */
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

        /**
        * execute an operation if initialized, add to initialization stack if not
        */
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

        /**
        * retrieves all files contained in a directory (and in subdirectory)
        */
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

        /**
        * normalize text to be conform to codemirro
        * @param text
        */
        FileSystem.prototype.normalizeText = function (text) {
            return text.replace(/\r\n/g, "\n");
        };
        return FileSystem;
    })();
    exports.FileSystem = FileSystem;
});
