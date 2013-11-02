define(["require", "exports", './fileSystem', './workingSet', './typescript/coreService', './typescript/script', './typescript/language'], function(require, exports, __fileSystem__, __ws__, __coreService__, __script__, __language__) {
    var fileSystem = __fileSystem__;
    var ws = __ws__;
    var coreService = __coreService__;
    var script = __script__;
    var language = __language__;
    var Services = TypeScript.Services;

    var BRACKETS_TYPESCRIPT_FILE_NAME = '.brackets-typescript';

    var TypeScriptProjectManager = (function () {
        function TypeScriptProjectManager(fileSystemService, workingSet, typeScriptProjectFactory) {
            var _this = this;
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    if (record.kind === fileSystem.FileChangeKind.REFRESH) {
                        _this.disposeProjects();
                        _this.createProjects();
                    } else if (isTypeScriptProjectConfigFile(record.path)) {
                        switch (record.kind) {
                            case fileSystem.FileChangeKind.DELETE:
                                if (_this.projectMap[record.path]) {
                                    _this.projectMap[record.path].dispose();
                                    delete _this.projectMap[record.path];
                                }
                                break;
                            case fileSystem.FileChangeKind.ADD:
                                _this.createProjectFromFile(record.path);
                                break;
                            case fileSystem.FileChangeKind.UPDATE:
                                _this.retrieveConfig(record.path).then(function (config) {
                                    if (config) {
                                        if (_this.projectMap[record.path]) {
                                            _this.projectMap[record.path].update(config);
                                        } else {
                                            _this.createProjectFromConfig(record.path, config);
                                        }
                                    }
                                });
                                break;
                        }
                    }
                });
            };
            this.fileSystemService = fileSystemService;
            this.typeScriptProjectFactory = typeScriptProjectFactory;
            this.workingSet = workingSet;
        }
        TypeScriptProjectManager.prototype.init = function () {
            this.createProjects();
            this.fileSystemService.projectFilesChanged.add(this.filesChangeHandler);
        };

        TypeScriptProjectManager.prototype.dispose = function () {
            this.fileSystemService.projectFilesChanged.remove(this.filesChangeHandler);
            this.disposeProjects();
        };

        TypeScriptProjectManager.prototype.getProjectForFile = function (path) {
            for (var configPath in this.projectMap) {
                if (this.projectMap[configPath].getProjectFileKind(path) === ProjectFileKind.SOURCE) {
                    return this.projectMap[configPath];
                }
            }

            for (var configPath in this.projectMap) {
                if (this.projectMap[configPath].getProjectFileKind(path) === ProjectFileKind.REFERENCE) {
                    return this.projectMap[configPath];
                }
            }

            return null;
        };

        TypeScriptProjectManager.prototype.createProjects = function () {
            var _this = this;
            this.projectMap = {};
            this.fileSystemService.getProjectFiles().then(function (paths) {
                paths.filter(isTypeScriptProjectConfigFile).forEach(_this.createProjectFromFile, _this);
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

        TypeScriptProjectManager.prototype.createProjectFromFile = function (configFilePath) {
            var _this = this;
            this.retrieveConfig(configFilePath).then(function (config) {
                return _this.createProjectFromConfig(configFilePath, config);
            });
        };

        TypeScriptProjectManager.prototype.createProjectFromConfig = function (configFilePath, config) {
            if (config) {
                this.projectMap[configFilePath] = this.typeScriptProjectFactory(PathUtils.directory(configFilePath), config, this.fileSystemService, this.workingSet);
            } else {
                this.projectMap[configFilePath] = null;
            }
        };

        TypeScriptProjectManager.prototype.retrieveConfig = function (configFilePath) {
            return this.fileSystemService.readFile(configFilePath).then(function (content) {
                var config;
                try  {
                    config = JSON.parse(content);
                } catch (e) {
                    console.log('invalid json for brackets-typescript config file: ' + configFilePath);
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

    function isTypeScriptProjectConfigFile(path) {
        return path && path.substr(path.lastIndexOf('/') + 1, path.length) === BRACKETS_TYPESCRIPT_FILE_NAME;
    }

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
        removeComments: false,
        allowAutomaticSemicolonInsertion: true,
        noLib: false,
        target: 'es3',
        module: 'none',
        mapSource: false,
        declaration: false,
        useCaseSensitiveFileResolution: false,
        allowBool: false,
        allowImportModule: false,
        noImplicitAny: false
    };

    (function (ProjectFileKind) {
        ProjectFileKind[ProjectFileKind["NONE"] = 0] = "NONE";
        ProjectFileKind[ProjectFileKind["SOURCE"] = 1] = "SOURCE";
        ProjectFileKind[ProjectFileKind["REFERENCE"] = 2] = "REFERENCE";
    })(exports.ProjectFileKind || (exports.ProjectFileKind = {}));
    var ProjectFileKind = exports.ProjectFileKind;

    var TypeScriptProject = (function () {
        function TypeScriptProject(baseDirectory, config, fileSystemService, workingSet, languageServiceHostFactory) {
            var _this = this;
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    switch (record.kind) {
                        case fileSystem.FileChangeKind.ADD:
                            if (_this.isProjectSourceFile(record.path) || _this.missingFiles[record.path]) {
                                _this.addFile(record.path);
                            }
                            break;
                        case fileSystem.FileChangeKind.DELETE:
                            if (_this.files.hasOwnProperty(record.path)) {
                                _this.removeFile(record.path);
                            }
                            break;
                        case fileSystem.FileChangeKind.UPDATE:
                            if (_this.files.hasOwnProperty(record.path)) {
                                _this.updateFile(record.path);
                            }
                            break;
                    }
                });
            };
            this.workingSetChangedHandler = function (changeRecord) {
                switch (changeRecord.kind) {
                    case ws.WorkingSetChangeKind.ADD:
                        changeRecord.paths.forEach(function (path) {
                            if (_this.files.hasOwnProperty(path)) {
                                _this.languageServiceHost.setScriptIsOpen(path, true);
                            }
                        });
                        break;
                    case ws.WorkingSetChangeKind.REMOVE:
                        changeRecord.paths.forEach(function (path) {
                            if (_this.files.hasOwnProperty(path)) {
                                _this.languageServiceHost.setScriptIsOpen(path, false);
                                _this.updateFile(path);
                            }
                        });
                        break;
                }
            };
            this.documentEditedHandler = function (records) {
                records.forEach(function (record) {
                    if (_this.files.hasOwnProperty(record.path)) {
                        if (!record.from || !record.to) {
                            _this.updateFile(record.path);
                        }
                        var minChar = _this.getIndexFromPos(record.path, record.from), limChar = _this.getIndexFromPos(record.path, record.to);

                        _this.languageServiceHost.editScript(record.path, minChar, limChar, record.text);
                    }
                });
            };
            this.baseDirectory = baseDirectory;
            this.config = config;
            this.fileSystemService = fileSystemService;
            this.workingSet = workingSet;
            this.languageServiceHostFactory = languageServiceHostFactory;
            this.collectFiles().then(function () {
                return _this.createLanguageServiceHost();
            }, function () {
                console.log("fuck");
            });

            this.fileSystemService.projectFilesChanged.add(this.filesChangeHandler);
            this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
            this.workingSet.documentEdited.add(this.documentEditedHandler);
        }
        TypeScriptProject.prototype.getLanguageService = function () {
            return this.languageService;
        };

        TypeScriptProject.prototype.getLanguageServiceHost = function () {
            return this.languageServiceHost;
        };

        TypeScriptProject.prototype.getFiles = function () {
            return $.extend({}, this.files);
        };

        TypeScriptProject.prototype.dispose = function () {
            this.fileSystemService.projectFilesChanged.remove(this.filesChangeHandler);
            this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
            this.workingSet.documentEdited.remove(this.documentEditedHandler);
        };

        TypeScriptProject.prototype.update = function (config) {
            this.config = config;
            this.collectFiles();
        };

        TypeScriptProject.prototype.getProjectFileKind = function (path) {
            if (this.files.hasOwnProperty(path)) {
                return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE : ProjectFileKind.REFERENCE;
            } else {
                return ProjectFileKind.NONE;
            }
        };

        TypeScriptProject.prototype.collectFiles = function () {
            var _this = this;
            this.files = {};
            this.missingFiles = {};
            this.references = {};
            return this.fileSystemService.getProjectFiles().then(function (paths) {
                var promises = [];
                paths.filter(function (path) {
                    return _this.isProjectSourceFile(path);
                }).forEach(function (path) {
                    return promises.push(_this.addFile(path));
                });
                return $.when.apply($, promises);
            });
        };

        TypeScriptProject.prototype.getReferencedOrImportedFiles = function (path) {
            if (!this.files[path]) {
                return [];
            }
            var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, script.getScriptSnapShot(path, this.files[path]));
            return preProcessedFileInfo.referencedFiles.map(function (fileRefence) {
                return PathUtils.makePathAbsolute(fileRefence.path, path);
            }).concat(preProcessedFileInfo.importedFiles.map(function (fileRefence) {
                return PathUtils.makePathAbsolute(fileRefence.path + '.ts', path);
            }));
        };

        TypeScriptProject.prototype.addFile = function (path) {
            var _this = this;
            if (!this.files.hasOwnProperty(path)) {
                this.files[path] = null;
                return this.fileSystemService.readFile(path).then(function (content) {
                    var promises = [];
                    if (content === null || content === undefined) {
                        _this.missingFiles[path] = true;
                        delete _this.files[path];
                        return null;
                    }
                    delete _this.missingFiles[path];
                    _this.files[path] = content;
                    _this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                        promises.push(_this.addFile(referencedPath));
                        _this.addReference(path, referencedPath);
                    });
                    if (_this.languageServiceHost) {
                        _this.languageServiceHost.addScript(path, content);
                    }
                    return $.when.apply($, promises);
                });
            }
            return null;
        };

        TypeScriptProject.prototype.removeFile = function (path) {
            var _this = this;
            if (this.files.hasOwnProperty(path)) {
                this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                    _this.removeReference(path, referencedPath);
                });
                if (this.references[path] && Object.keys(this.references[path]).length > 0) {
                    this.missingFiles[path] = true;
                }
                if (this.languageServiceHost) {
                    this.languageServiceHost.removeScript(path);
                }
                delete this.files[path];
            }
        };

        TypeScriptProject.prototype.updateFile = function (path) {
            var _this = this;
            this.fileSystemService.readFile(path).then(function (content) {
                var oldPathMap = {};
                _this.getReferencedOrImportedFiles(path).forEach(function (path) {
                    return oldPathMap[path] = true;
                });
                _this.files[path] = content;
                _this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                    delete oldPathMap[referencedPath];
                    if (!_this.files.hasOwnProperty(referencedPath)) {
                        _this.addFile(referencedPath);
                        _this.addReference(path, referencedPath);
                    }
                });

                Object.keys(oldPathMap).forEach(function (referencedPath) {
                    _this.removeReference(path, referencedPath);
                });

                if (_this.languageServiceHost) {
                    _this.languageServiceHost.updateScript(path, content);
                }
            });
        };

        TypeScriptProject.prototype.addReference = function (path, referencedPath) {
            if (!this.references[referencedPath]) {
                this.references[referencedPath] = {};
            }
            this.references[referencedPath][path] = true;
        };

        TypeScriptProject.prototype.removeReference = function (path, referencedPath) {
            var fileRefs = this.references[referencedPath];
            if (!fileRefs) {
                this.removeFile(referencedPath);
            }
            delete fileRefs[path];
            if (Object.keys(fileRefs).length === 0) {
                delete this.references[referencedPath];
                this.removeFile(referencedPath);
            }
        };

        TypeScriptProject.prototype.isProjectSourceFile = function (path) {
            path = PathUtils.makePathRelative(path, this.baseDirectory);
            return this.config.sources.some(function (pattern) {
                return minimatch(path, pattern);
            });
        };

        TypeScriptProject.prototype.getIndexFromPos = function (path, position) {
            return this.languageServiceHost.lineColToPosition(path, position.line, position.ch);
        };

        TypeScriptProject.prototype.createLanguageServiceHost = function () {
            var _this = this;
            var compilationSettings = new TypeScript.CompilationSettings(), moduleType = this.config.module.toLowerCase();
            compilationSettings.propagateEnumConstants = this.config.propagateEnumConstants;
            compilationSettings.removeComments = this.config.removeComments;
            compilationSettings.noLib = this.config.noLib;
            compilationSettings.noImplicitAny = this.config.noImplicitAny;
            compilationSettings.outFileOption = this.config.outFile || '';
            compilationSettings.outDirOption = this.config.outDir || '';
            compilationSettings.mapSourceFiles = this.config.mapSource;
            compilationSettings.sourceRoot = this.config.sourceRoot || '';
            compilationSettings.mapRoot = this.config.mapRoot || '';
            compilationSettings.useCaseSensitiveFileResolution = this.config.useCaseSensitiveFileResolution;
            compilationSettings.generateDeclarationFiles = this.config.declaration;
            compilationSettings.generateDeclarationFiles = this.config.declaration;
            compilationSettings.generateDeclarationFiles = this.config.declaration;
            compilationSettings.codeGenTarget = this.config.target.toLowerCase() === 'es3' ? TypeScript.LanguageVersion.EcmaScript3 : TypeScript.LanguageVersion.EcmaScript5;

            compilationSettings.moduleGenTarget = moduleType === 'none' ? TypeScript.ModuleGenTarget.Unspecified : (moduleType === 'amd' ? TypeScript.ModuleGenTarget.Asynchronous : TypeScript.ModuleGenTarget.Synchronous);

            this.languageServiceHost = this.languageServiceHostFactory(compilationSettings, this.getFiles());
            if (!compilationSettings.noLib) {
                this.addDefaultLibrary();
            }
            this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);

            this.workingSet.files.forEach(function (path) {
                if (_this.files.hasOwnProperty(path)) {
                    _this.languageServiceHost.setScriptIsOpen(path, true);
                }
            });
        };

        TypeScriptProject.prototype.addDefaultLibrary = function () {
            this.languageServiceHost.addScript('TypescriptDefaulLib', TypeScriptDefaultLibraryContent);
        };
        return TypeScriptProject;
    })();
    exports.TypeScriptProject = TypeScriptProject;

    function typeScriptProjectFactory(baseDirectory, config, fileSystemService, workingSet) {
        return new TypeScriptProject(baseDirectory, config, fileSystemService, workingSet, function (settings, files) {
            return new language.LanguageServiceHost(settings, files);
        });
    }
    exports.typeScriptProjectFactory = typeScriptProjectFactory;
});
