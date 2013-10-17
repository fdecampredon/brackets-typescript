define(["require", "exports", './utils/fileUtils'], function(require, exports, __fileUtils__) {
    var fileUtils = __fileUtils__;

    var BRACKETS_TYPESCRIPT_FILE_NAME = '.brackets-typescript';

    var TypeScriptProjectManager = (function () {
        function TypeScriptProjectManager(fileSystemObserver, fileInfosResolver, typeScriptProjectFactory, reader) {
            var _this = this;
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    switch (record.kind) {
                        case fileUtils.FileChangeKind.DELETE:
                            if (_this.projectMap[record.file.fullPath]) {
                                _this.projectMap[record.file.fullPath].dispose();
                                delete _this.projectMap[record.file.fullPath];
                            }
                            break;
                        case fileUtils.FileChangeKind.ADD:
                            _this.createProjectFromFile(record.file);
                            break;
                        case fileUtils.FileChangeKind.UPDATE:
                            _this.retrieveConfig(record.file).then(function (config) {
                                if (config) {
                                    if (_this.projectMap[record.file.fullPath]) {
                                        _this.projectMap[record.file.fullPath].update(config);
                                    } else {
                                        _this.createProjectFromConfig(config, record.file.fullPath);
                                    }
                                }
                            });
                            break;
                        case fileUtils.FileChangeKind.REFRESH:
                            _this.disposeProjects();
                            _this.createProjects();
                            break;
                    }
                });
            };
            this.fileSystemObserver = fileSystemObserver;
            this.fileInfosResolver = fileInfosResolver;
            this.typeScriptProjectFactory = typeScriptProjectFactory;
            this.reader = reader;
        }
        TypeScriptProjectManager.prototype.init = function () {
            this.createProjects();
            this.fileSystemObserver.add(this.filesChangeHandler);
        };

        TypeScriptProjectManager.prototype.dispose = function () {
            this.fileSystemObserver.remove(this.filesChangeHandler);
            this.disposeProjects();
        };

        TypeScriptProjectManager.prototype.createProjects = function () {
            var _this = this;
            this.projectMap = {};
            this.fileInfosResolver().then(function (fileInfos) {
                fileInfos.filter(function (fileInfo) {
                    return fileInfo.name === BRACKETS_TYPESCRIPT_FILE_NAME;
                }).forEach(_this.createProjectFromFile, _this);
            });
        };

        TypeScriptProjectManager.prototype.disposeProjects = function () {
            var projectMap = this.projectMap;
            for (var path in projectMap) {
                if (projectMap.hasOwnProperty(path) && projectMap[path]) {
                    projectMap[path].dispose();
                }
            }
            this.projectMap = {};
        };

        TypeScriptProjectManager.prototype.createProjectFromFile = function (fileInfo) {
            var _this = this;
            this.retrieveConfig(fileInfo).then(function (config) {
                return _this.createProjectFromConfig(config, fileInfo.fullPath);
            });
        };

        TypeScriptProjectManager.prototype.createProjectFromConfig = function (config, path) {
            this.projectMap[path] = config && this.typeScriptProjectFactory(PathUtils.directory(path), config);
        };

        TypeScriptProjectManager.prototype.retrieveConfig = function (fileInfo) {
            return this.reader(fileInfo.fullPath).then(function (content) {
                var config;
                try  {
                    config = JSON.parse(content);
                } catch (e) {
                    console.log('invalid json for brackets-typescript config file: ' + fileInfo.fullPath);
                }

                if (config) {
                    for (var property in exports.typeScriptProjectConfigDefault) {
                        if (exports.typeScriptProjectConfigDefault.hasOwnProperty(property) && !config.hasOwnProperty(property)) {
                            (config)[property] = (exports.typeScriptProjectConfigDefault)[config];
                        }
                    }
                    if (!exports.validateTypeScriptProjectConfig(config)) {
                        config = null;
                    }
                }
                return config;
            });
        };
        return TypeScriptProjectManager;
    })();
    exports.TypeScriptProjectManager = TypeScriptProjectManager;

    function validateTypeScriptProjectConfig(config) {
        if (!config) {
            return false;
        }
        if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(function (sourceItem) {
            return typeof sourceItem === 'string';
        })) {
            return false;
        }
        if (!(config.outDir && typeof config.outDir === 'string') && !(config.outFile && typeof config.outFile === 'string')) {
            return false;
        }
        return true;
    }
    exports.validateTypeScriptProjectConfig = validateTypeScriptProjectConfig;

    exports.typeScriptProjectConfigDefault = {
        compileOnSave: false,
        propagateEnumConstants: false,
        removeComments: true,
        allowAutomaticSemicolonInsertion: true,
        noLib: false,
        target: 'es3',
        module: 'none',
        mapSource: false,
        declaration: false,
        useCaseSensitiveFileResolution: false,
        allowBool: false,
        allowImportModule: false
    };

    var TypeScriptProject = (function () {
        function TypeScriptProject() {
        }
        TypeScriptProject.prototype.dispose = function () {
        };

        TypeScriptProject.prototype.update = function (config) {
        };
        return TypeScriptProject;
    })();
    exports.TypeScriptProject = TypeScriptProject;

    function newTypeScriptProject(config) {
        return null;
    }
    exports.newTypeScriptProject = newTypeScriptProject;
});
