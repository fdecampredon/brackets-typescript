define(["require", "exports", './fileSystem', './workingSet', './typescript/coreService', './typescript/script', './typescript/language', './typeScriptUtils', './utils/collections'], function(require, exports, __fs__, __ws__, __coreService__, __script__, __language__, __utils__, __collections__) {
    var fs = __fs__;
    var ws = __ws__;
    var coreService = __coreService__;
    var script = __script__;
    var language = __language__;
    var utils = __utils__;
    var collections = __collections__;
    var Services = TypeScript.Services;

    var TypeScriptProjectManager = (function () {
        function TypeScriptProjectManager(fileSystem, workingSet) {
            var _this = this;
            this.fileSystem = fileSystem;
            this.workingSet = workingSet;
            this.projectMap = new collections.StringMap();
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    if (record.kind === fs.FileChangeKind.RESET) {
                        _this.disposeProjects();
                        _this.createProjects();
                        return false;
                    } else if (utils.isTypeScriptProjectConfigFile(record.path)) {
                        switch (record.kind) {
                            case fs.FileChangeKind.DELETE:
                                if (_this.projectMap.has(record.path)) {
                                    _this.projectMap.get(record.path).dispose();
                                    _this.projectMap.delete(record.path);
                                }
                                break;

                            case fs.FileChangeKind.ADD:
                                _this.createProjectFromFile(record.path);
                                break;

                            case fs.FileChangeKind.UPDATE:
                                _this.retrieveConfig(record.path).then(function (config) {
                                    if (config) {
                                        if (_this.projectMap.has(record.path)) {
                                            _this.projectMap.get(record.path).update(config);
                                        } else {
                                            _this.createProjectFromConfig(record.path, config);
                                        }
                                    }
                                });
                                break;
                        }
                    }
                    return true;
                });
            };
        }
        TypeScriptProjectManager.prototype.init = function () {
            this.createProjects();
            this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
        };

        TypeScriptProjectManager.prototype.dispose = function () {
            this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
            this.disposeProjects();
        };

        TypeScriptProjectManager.prototype.getProjectForFile = function (path) {
            var projects = this.projectMap.values, project = null;

            projects.some(function (tsProject) {
                if (tsProject.getProjectFileKind(path) === ProjectFileKind.SOURCE) {
                    project = tsProject;
                    return true;
                }
            });

            if (!project) {
                projects.some(function (tsProject) {
                    if (tsProject.getProjectFileKind(path) === ProjectFileKind.REFERENCE) {
                        project = tsProject;
                        return true;
                    }
                });
            }

            return project;
        };

        TypeScriptProjectManager.prototype.createProjects = function () {
            var _this = this;
            this.fileSystem.getProjectFiles().then(function (paths) {
                paths.filter(utils.isTypeScriptProjectConfigFile).forEach(_this.createProjectFromFile, _this);
            });
        };

        TypeScriptProjectManager.prototype.disposeProjects = function () {
            var projectMap = this.projectMap;
            projectMap.keys.forEach(function (path) {
                return projectMap.get(path).dispose();
            });
            this.projectMap.clear();
        };

        TypeScriptProjectManager.prototype.createProjectFromFile = function (configFilePath) {
            var _this = this;
            this.retrieveConfig(configFilePath).then(function (config) {
                return _this.createProjectFromConfig(configFilePath, config);
            });
        };

        TypeScriptProjectManager.prototype.createProjectFromConfig = function (configFilePath, config) {
            if (config) {
                this.projectMap.set(configFilePath, this.newProject(PathUtils.directory(configFilePath), config));
            }
        };

        TypeScriptProjectManager.prototype.newProject = function (baseDir, config) {
            return new TypeScriptProject(baseDir, config, this.fileSystem, this.workingSet);
        };

        TypeScriptProjectManager.prototype.retrieveConfig = function (configFilePath) {
            return this.fileSystem.readFile(configFilePath).then(function (content) {
                var config;
                try  {
                    config = JSON.parse(content);
                } catch (e) {
                    console.log('invalid json for brackets-typescript config file: ' + configFilePath);
                }

                if (config) {
                    for (var property in utils.typeScriptProjectConfigDefault) {
                        if (!config.hasOwnProperty(property)) {
                            config[property] = utils.typeScriptProjectConfigDefault[property];
                        }
                    }
                    if (!utils.validateTypeScriptProjectConfig(config)) {
                        config = null;
                    }
                }
                return config;
            });
        };
        return TypeScriptProjectManager;
    })();
    exports.TypeScriptProjectManager = TypeScriptProjectManager;

    (function (ProjectFileKind) {
        ProjectFileKind[ProjectFileKind["NONE"] = 0] = "NONE";

        ProjectFileKind[ProjectFileKind["SOURCE"] = 1] = "SOURCE";

        ProjectFileKind[ProjectFileKind["REFERENCE"] = 2] = "REFERENCE";
    })(exports.ProjectFileKind || (exports.ProjectFileKind = {}));
    var ProjectFileKind = exports.ProjectFileKind;

    var TypeScriptProject = (function () {
        function TypeScriptProject(baseDirectory, config, fileSystem, workingSet) {
            var _this = this;
            this.baseDirectory = baseDirectory;
            this.config = config;
            this.fileSystem = fileSystem;
            this.workingSet = workingSet;
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    switch (record.kind) {
                        case fs.FileChangeKind.ADD:
                            if (_this.isProjectSourceFile(record.path) || _this.missingFiles.has(record.path)) {
                                _this.addFile(record.path);
                            }
                            break;
                        case fs.FileChangeKind.DELETE:
                            if (_this.projectScripts.has(record.path)) {
                                _this.removeFile(record.path);
                            }
                            break;
                        case fs.FileChangeKind.UPDATE:
                            if (_this.projectScripts.has(record.path)) {
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
                            if (_this.projectScripts.has(path)) {
                                _this.projectScripts.get(path).isOpen = true;
                            }
                        });
                        break;
                    case ws.WorkingSetChangeKind.REMOVE:
                        changeRecord.paths.forEach(function (path) {
                            if (_this.projectScripts.has(path)) {
                                _this.projectScripts.get(path).isOpen = false;
                            }
                        });
                        break;
                }
            };
            this.documentEditedHandler = function (records) {
                records.forEach(function (record) {
                    if (_this.projectScripts.has(record.path)) {
                        if (!record.from || !record.to) {
                            _this.updateFile(record.path);
                        }
                        var minChar = _this.getIndexFromPos(record.path, record.from), limChar = _this.getIndexFromPos(record.path, record.to);

                        _this.projectScripts.get(record.path).editContent(minChar, limChar, record.text);
                    }
                });
            };
            this.collectFiles().then(function () {
                _this.compilationSettings = _this.createCompilationSettings();
                _this.createLanguageServiceHost();
                if (!_this.compilationSettings.noLib) {
                    _this.addDefaultLibrary();
                }
                _this.workingSet.files.forEach(function (path) {
                    var script = _this.projectScripts.get(path);
                    if (script) {
                        script.isOpen = true;
                    }
                });
                _this.workingSet.workingSetChanged.add(_this.workingSetChangedHandler);
                _this.workingSet.documentEdited.add(_this.documentEditedHandler);
                _this.fileSystem.projectFilesChanged.add(_this.filesChangeHandler);
            }, function () {
                console.log('Errors in collecting project files');
            });
        }
        TypeScriptProject.prototype.getCompilationSettings = function () {
            return this.compilationSettings;
        };

        TypeScriptProject.prototype.getScripts = function () {
            return this.projectScripts;
        };

        TypeScriptProject.prototype.getLanguageService = function () {
            return this.languageService;
        };

        TypeScriptProject.prototype.dispose = function () {
            this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
            this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
            this.workingSet.documentEdited.remove(this.documentEditedHandler);
        };

        TypeScriptProject.prototype.update = function (config) {
        };

        TypeScriptProject.prototype.getProjectFileKind = function (path) {
            if (this.projectScripts.has(path)) {
                return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE : ProjectFileKind.REFERENCE;
            } else {
                return ProjectFileKind.NONE;
            }
        };

        TypeScriptProject.prototype.getIndexFromPos = function (path, position) {
            var script = this.projectScripts.get(path);
            if (script) {
                return script.lineMap.getPosition(position.line, position.ch);
            }
            return -1;
        };

        TypeScriptProject.prototype.indexToPosition = function (path, index) {
            var script = this.projectScripts.get(path);
            if (script) {
                var tsPosition = script.getLineAndColForPositon(index);
                return {
                    ch: tsPosition.character,
                    line: tsPosition.line
                };
            }
            return null;
        };

        TypeScriptProject.prototype.collectFiles = function () {
            var _this = this;
            this.projectScripts = new collections.StringMap();
            this.missingFiles = new collections.StringSet();
            this.references = new collections.StringMap();
            return this.fileSystem.getProjectFiles().then(function (paths) {
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
            if (!this.projectScripts.has(path)) {
                return [];
            }
            var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, new script.ScriptSnapshot(this.projectScripts.get(path)));
            return preProcessedFileInfo.referencedFiles.map(function (fileRefence) {
                return PathUtils.makePathAbsolute(fileRefence.path, path);
            }).concat(preProcessedFileInfo.importedFiles.map(function (fileRefence) {
                return PathUtils.makePathAbsolute(fileRefence.path + '.ts', path);
            }));
        };

        TypeScriptProject.prototype.addFile = function (path) {
            var _this = this;
            if (!this.projectScripts.has(path)) {
                this.projectScripts.set(path, null);
                return this.fileSystem.readFile(path).then(function (content) {
                    var promises = [];
                    if (content === null || content === undefined) {
                        _this.missingFiles.add(path);
                        _this.projectScripts.delete(path);
                        return null;
                    }
                    _this.missingFiles.remove(path);
                    _this.projectScripts.set(path, _this.createScriptInfo(path, content));
                    _this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                        promises.push(_this.addFile(referencedPath));
                        _this.addReference(path, referencedPath);
                    });
                    return $.when.apply($, promises);
                });
            }
            return null;
        };

        TypeScriptProject.prototype.removeFile = function (path) {
            var _this = this;
            if (this.projectScripts.has(path)) {
                this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                    _this.removeReference(path, referencedPath);
                });
                if (this.references.has(path) && this.references.get(path).keys.length > 0) {
                    this.missingFiles.add(path);
                }
                this.projectScripts.delete(path);
            }
        };

        TypeScriptProject.prototype.updateFile = function (path) {
            var _this = this;
            this.fileSystem.readFile(path).then(function (content) {
                var oldPathMap = {};
                _this.getReferencedOrImportedFiles(path).forEach(function (path) {
                    return oldPathMap[path] = true;
                });
                _this.projectScripts.get(path).updateContent(content);
                _this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                    delete oldPathMap[referencedPath];
                    if (!_this.projectScripts.has(referencedPath)) {
                        _this.addFile(referencedPath);
                        _this.addReference(path, referencedPath);
                    }
                });

                Object.keys(oldPathMap).forEach(function (referencedPath) {
                    _this.removeReference(path, referencedPath);
                });
            });
        };

        TypeScriptProject.prototype.addReference = function (path, referencedPath) {
            if (!this.references.has(referencedPath)) {
                this.references.set(referencedPath, new collections.StringSet());
            }
            this.references.get(referencedPath).add(path);
        };

        TypeScriptProject.prototype.removeReference = function (path, referencedPath) {
            var fileRefs = this.references.get(referencedPath);
            if (!fileRefs) {
                this.removeFile(referencedPath);
            }
            fileRefs.remove(path);
            if (fileRefs.keys.length === 0) {
                this.references.delete(referencedPath);
                this.removeFile(referencedPath);
            }
        };

        TypeScriptProject.prototype.isProjectSourceFile = function (path) {
            path = PathUtils.makePathRelative(path, this.baseDirectory);
            return this.config.sources.some(function (pattern) {
                return utils.minimatch(path, pattern);
            });
        };

        TypeScriptProject.prototype.createScriptInfo = function (path, content) {
            return new script.ScriptInfo(path, content);
        };

        TypeScriptProject.prototype.createCompilationSettings = function () {
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
            return compilationSettings;
        };

        TypeScriptProject.prototype.createLanguageServiceHost = function () {
            this.languageServiceHost = new language.LanguageServiceHost(this.compilationSettings, this.projectScripts);
            this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
        };

        TypeScriptProject.prototype.addDefaultLibrary = function () {
            this.addFile(utils.DEFAULT_LIB_LOCATION);
        };
        return TypeScriptProject;
    })();
    exports.TypeScriptProject = TypeScriptProject;
});
