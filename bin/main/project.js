define(["require", "exports", './fileSystem', './workingSet', './typescript/coreService', './typescript/script', './typescript/language', './typeScriptUtils', './utils/collections', './utils/immediate'], function(require, exports, fs, ws, coreService, script, language, utils, collections, immediate) {
    var Services = TypeScript.Services;

    //--------------------------------------------------------------------------
    //
    //  TypeScriptProjectManager
    //
    //--------------------------------------------------------------------------
    /**
    * The main facade class of the extentions, responsible to create / destroy / update projects
    * by observing config files in the files of the opened brackets folder
    */
    var TypeScriptProjectManager = (function () {
        //-------------------------------
        //  constructor
        //-------------------------------
        /**
        * @param fileSystem the fileSystem wrapper used by the projectManager
        * @param workingSet the working set wrapper used by the projectManager
        */
        function TypeScriptProjectManager(fileSystem, workingSet) {
            var _this = this;
            this.fileSystem = fileSystem;
            this.workingSet = workingSet;
            //-------------------------------
            //  variables
            //-------------------------------
            /**
            * a map containing the projects
            */
            this.projectMap = new collections.StringMap();
            /**
            * a map containing the projects
            */
            this.servicesFactory = [];
            //-------------------------------
            //  Events Handler
            //-------------------------------
            /**
            * handle changes in the file system, update / delete / create project accordingly
            */
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    if (record.kind === 3 /* RESET */) {
                        //reinitialize the projects if file system reset
                        _this.disposeProjects();
                        _this.createProjects();
                        return false;
                    } else if (utils.isTypeScriptProjectConfigFile(record.path)) {
                        switch (record.kind) {
                            case 2 /* DELETE */:
                                if (_this.projectMap.has(record.path)) {
                                    _this.projectMap.get(record.path).dispose();
                                    _this.projectMap.delete(record.path);
                                }
                                break;

                            case 0 /* ADD */:
                                _this.createProjectFromFile(record.path);
                                break;

                            case 1 /* UPDATE */:
                                _this.retrieveConfig(record.path).then(function (config) {
                                    if (config) {
                                        if (_this.projectMap.has(record.path)) {
                                            //config file has been updated create the project
                                            _this.projectMap.get(record.path).update(config);
                                        } else {
                                            // this config file was already present, but was invalid, now create the project
                                            // with the obtained valid config file
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
        //-------------------------------
        // Public methods
        //-------------------------------
        /**
        * initialize the project manager
        */
        TypeScriptProjectManager.prototype.init = function () {
            this.createProjects();
            this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
        };

        TypeScriptProjectManager.prototype.registerService = function (serviceFactory) {
            this.servicesFactory.push(serviceFactory);
        };

        /**
        * dispose the project manager
        */
        TypeScriptProjectManager.prototype.dispose = function () {
            this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
            this.disposeProjects();
        };

        /**
        * this method will try to find a project referencing the given path
        * it will by priority try to retrive project that have that file as part of 'direct source'
        * before returning projects that just have 'reference' to this file
        *
        * @param path the path of the typesrcript file for which project are looked fo
        */
        TypeScriptProjectManager.prototype.getProjectForFile = function (path) {
            var projects = this.projectMap.values, project = null;

            //first we check for a project that have tha file as source
            projects.some(function (tsProject) {
                if (tsProject.getProjectFileKind(path) === 1 /* SOURCE */) {
                    project = tsProject;
                    return true;
                }
            });

            if (!project) {
                projects.some(function (tsProject) {
                    if (tsProject.getProjectFileKind(path) === 2 /* REFERENCE */) {
                        project = tsProject;
                        return true;
                    }
                });
            }

            //TODO return a kind of "single file project" if no project are found
            return project;
        };

        //-------------------------------
        //  Private methods
        //-------------------------------
        /**
        * find bracketsTypescript config files and create a project for each file founds
        */
        TypeScriptProjectManager.prototype.createProjects = function () {
            var _this = this;
            this.fileSystem.getProjectFiles().then(function (paths) {
                paths.filter(utils.isTypeScriptProjectConfigFile).forEach(_this.createProjectFromFile, _this);
            });
        };

        /**
        * dispose every projects created by the project Manager
        */
        TypeScriptProjectManager.prototype.disposeProjects = function () {
            var projectMap = this.projectMap;
            projectMap.keys.forEach(function (path) {
                return projectMap.get(path).dispose();
            });
            this.projectMap.clear();
        };

        /**
        * for a given config file create a project
        *
        * @param configFilePath the config file path
        */
        TypeScriptProjectManager.prototype.createProjectFromFile = function (configFilePath) {
            var _this = this;
            this.retrieveConfig(configFilePath).then(function (config) {
                return _this.createProjectFromConfig(configFilePath, config);
            });
        };

        /**
        * for given validated config and config file path create a project
        *
        * @param configFilePath the config file path
        * @param config the config created from the file
        */
        TypeScriptProjectManager.prototype.createProjectFromConfig = function (configFilePath, config) {
            if (config) {
                var project = this.newProject(PathUtils.directory(configFilePath), config);
                project.init(this.servicesFactory.map(function (serviceFactory) {
                    return serviceFactory(project);
                }));
                this.projectMap.set(configFilePath, project);
            }
        };

        TypeScriptProjectManager.prototype.newProject = function (baseDir, config) {
            return new TypeScriptProject(baseDir, config, this.fileSystem, this.workingSet);
        };

        /**
        * try to create a config from a given config file path
        * validate the config file, then add default values if needed
        *
        * @param configFilePath
        */
        TypeScriptProjectManager.prototype.retrieveConfig = function (configFilePath) {
            return this.fileSystem.readFile(configFilePath).then(function (content) {
                var config;
                try  {
                    config = JSON.parse(content);
                } catch (e) {
                    //TODO logging strategy
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

    

    

    

    

    

    /**
    * enum describing the type of file ib a project
    */
    (function (ProjectFileKind) {
        /**
        * the file is not a part of the project
        */
        ProjectFileKind[ProjectFileKind["NONE"] = 0] = "NONE";

        /**
        * the file is a source file of the project
        */
        ProjectFileKind[ProjectFileKind["SOURCE"] = 1] = "SOURCE";

        /**
        * the file is referenced by a source file of the project
        */
        ProjectFileKind[ProjectFileKind["REFERENCE"] = 2] = "REFERENCE";
    })(exports.ProjectFileKind || (exports.ProjectFileKind = {}));
    var ProjectFileKind = exports.ProjectFileKind;

    

    /**
    * class representing a typescript project, responsible of synchronizing
    * languageServiceHost with the file system
    */
    var TypeScriptProject = (function () {
        //-------------------------------
        //  constructor
        //-------------------------------
        /**
        * @param baseDirectory the baseDirectory of the project
        * @param config the project config file
        * @param fileSystem the fileSystem wrapper used by the project
        * @param workingSet the working set wrapper used by the project
        */
        function TypeScriptProject(baseDirectory, config, fileSystem, workingSet) {
            var _this = this;
            this.baseDirectory = baseDirectory;
            this.config = config;
            this.fileSystem = fileSystem;
            this.workingSet = workingSet;
            /**
            * current stored delta before notification
            */
            this.delta = {
                fileDeleted: [],
                fileAdded: [],
                fileUpdated: []
            };
            //-------------------------------
            //  Events Handler
            //-------------------------------
            /**
            * handle changes in the fileSystem
            */
            this.filesChangeHandler = function (changeRecords) {
                changeRecords.forEach(function (record) {
                    switch (record.kind) {
                        case 0 /* ADD */:
                            if (_this.isProjectSourceFile(record.path) || _this.missingFiles.has(record.path)) {
                                _this.addFile(record.path);
                            }
                            break;
                        case 2 /* DELETE */:
                            if (_this.projectScripts.has(record.path)) {
                                _this.removeFile(record.path);
                            }
                            break;
                        case 1 /* UPDATE */:
                            if (_this.projectScripts.has(record.path)) {
                                _this.updateFile(record.path);
                            }
                            break;
                    }
                });
            };
            /**
            * handle changes in the workingSet
            */
            this.workingSetChangedHandler = function (changeRecord) {
                switch (changeRecord.kind) {
                    case 0 /* ADD */:
                        changeRecord.paths.forEach(function (path) {
                            if (_this.projectScripts.has(path)) {
                                _this.projectScripts.get(path).isOpen = true;
                            }
                        });
                        break;
                    case 1 /* REMOVE */:
                        changeRecord.paths.forEach(function (path) {
                            if (_this.projectScripts.has(path)) {
                                _this.projectScripts.get(path).isOpen = false;
                                _this.updateFile(path);
                            }
                        });
                        break;
                }
            };
            /**
            * handle document edition
            */
            this.documentEditedHandler = function (records) {
                records.forEach(function (record) {
                    if (_this.projectScripts.has(record.path)) {
                        var oldPaths = new collections.StringSet(_this.getReferencedOrImportedFiles(record.path));

                        if (!record.from || !record.to) {
                            _this.projectScripts.get(record.path).updateContent(record.documentText);
                        } else {
                            var minChar = _this.getIndexFromPos(record.path, record.from), limChar = _this.getIndexFromPos(record.path, record.to);

                            _this.projectScripts.get(record.path).editContent(minChar, limChar, record.text);
                        }

                        _this.updateReferences(record.path, oldPaths);
                    }
                });
            };
        }
        //-------------------------------
        //  public method
        //-------------------------------
        /**
        * initlialize
        * @param services
        */
        TypeScriptProject.prototype.init = function (services) {
            this.services = services || [];
            this.internalInit();
        };

        /**
        * rinitialize the project
        */
        TypeScriptProject.prototype.reset = function () {
            this.dispose();
            this.internalInit();
        };

        /**
        * return  the compilation settings extracted from the project config file
        */
        TypeScriptProject.prototype.getCompilationSettings = function () {
            return this.compilationSettings;
        };

        /**
        * get compilations settings
        */
        TypeScriptProject.prototype.getScripts = function () {
            return this.projectScripts;
        };

        /**
        * return the language service associated to this project
        */
        TypeScriptProject.prototype.getLanguageService = function () {
            return this.languageService;
        };

        /**
        * dispose the project
        */
        TypeScriptProject.prototype.dispose = function () {
            this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
            this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
            this.workingSet.documentEdited.remove(this.documentEditedHandler);
        };

        /**
        * update the project config
        * @param config
        */
        TypeScriptProject.prototype.update = function (config) {
            this.config = config;
            this.reset();
        };

        /**
        * for a given path, give the relation between the project an the associated file
        * @param path
        */
        TypeScriptProject.prototype.getProjectFileKind = function (path) {
            if (this.projectScripts.has(path)) {
                return this.isProjectSourceFile(path) ? 1 /* SOURCE */ : 2 /* REFERENCE */;
            } else {
                return 0 /* NONE */;
            }
        };

        /**
        * return an index from a positon in line/char
        * @param path the path of the file
        * @param position the position
        */
        TypeScriptProject.prototype.getIndexFromPos = function (path, position) {
            var script = this.projectScripts.get(path);
            if (script) {
                return script.lineMap.getPosition(position.line, position.ch);
            }
            return -1;
        };

        /**
        * return a positon in line/char from an index
        * @param path the path of the file
        * @param index the index
        */
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

        //-------------------------------
        //  private methods
        //-------------------------------
        /**
        * initialize the project
        */
        TypeScriptProject.prototype.internalInit = function () {
            var _this = this;
            this.initialized = false;
            this.collectFiles().then(function () {
                _this.compilationSettings = _this.createCompilationSettings();
                if (!_this.compilationSettings.noLib) {
                    _this.addDefaultLibrary();
                }
                _this.createLanguageService();
                _this.workingSet.files.forEach(function (path) {
                    var script = _this.projectScripts.get(path);
                    if (script) {
                        script.isOpen = true;
                    }
                });
                _this.workingSet.workingSetChanged.add(_this.workingSetChangedHandler);
                _this.workingSet.documentEdited.add(_this.documentEditedHandler);
                _this.fileSystem.projectFilesChanged.add(_this.filesChangeHandler);
                _this.services.forEach(function (service) {
                    return service.run(true, null);
                });
                _this.initialized = true;
            }, function () {
                //TODO handle errors;
                console.log('Errors in collecting project files');
            });
        };

        //-------------------------------
        //  Scripts manipulation
        //-------------------------------
        /**
        * retrive files content for path described in the config
        */
        TypeScriptProject.prototype.collectFiles = function () {
            var _this = this;
            this.projectScripts = new collections.StringMap();
            this.missingFiles = new collections.StringSet();
            this.references = new collections.StringMap();
            return this.fileSystem.getProjectFiles().then(function (paths) {
                var promises = [];
                paths.forEach(function (path) {
                    if (_this.isProjectSourceFile(path)) {
                        var promise = _this.addFile(path, false);
                        promises.push();
                    }
                });
                return $.when.apply($, promises);
            });
        };

        /**
        * add a file to the project
        * @param path
        */
        TypeScriptProject.prototype.addFile = function (path, notify) {
            if (typeof notify === "undefined") { notify = true; }
            var _this = this;
            if (!this.projectScripts.has(path)) {
                this.projectScripts.set(path, null);
                this.fileSystem.readFile(path).then(function (content) {
                    var promises = [];
                    _this.missingFiles.remove(path);
                    _this.projectScripts.set(path, _this.createScriptInfo(path, content));
                    if (notify) {
                        _this.notifyFileAdded(path);
                    }
                    _this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                        promises.push(_this.addFile(referencedPath));
                        _this.addReference(path, referencedPath);
                    });
                    return $.when.apply($, promises);
                }, function () {
                    _this.projectScripts.delete(path);
                    if (!_this.getReferencedOrImportedFiles(path) !== null) {
                        _this.missingFiles.add(path);
                    }
                });
            }
            return null;
        };

        /**
        * remove a file from the project
        * @param path
        */
        TypeScriptProject.prototype.removeFile = function (path) {
            var _this = this;
            if (this.projectScripts.has(path)) {
                this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                    _this.removeReference(path, referencedPath);
                });
                if (this.references.has(path) && this.references.get(path).values.length > 0) {
                    this.missingFiles.add(path);
                }
                this.projectScripts.delete(path);
                this.notifyFileDeleted(path);
            }
        };

        /**
        * update a project file
        * @param path
        */
        TypeScriptProject.prototype.updateFile = function (path) {
            var _this = this;
            this.fileSystem.readFile(path).then(function (content) {
                var oldPaths = new collections.StringSet(_this.getReferencedOrImportedFiles(path));
                _this.projectScripts.get(path).updateContent(content);
                _this.notifyFileUpdated(path);
                _this.updateReferences(path, oldPaths);
            });
        };

        /**
        * return true a if a given file path match the config
        * @param path
        */
        TypeScriptProject.prototype.isProjectSourceFile = function (path) {
            path = PathUtils.makePathRelative(path, this.baseDirectory);
            return this.config.sources.some(function (pattern) {
                return utils.minimatch(path, pattern);
            });
        };

        /**
        * create a scriptInfo
        * @param path
        * @param content
        */
        TypeScriptProject.prototype.createScriptInfo = function (path, content) {
            return new script.ScriptInfo(path, content);
        };

        //-------------------------------
        //  References
        //-------------------------------
        /**
        * for a given file retrives the file referenced or imported by this file
        * @param path
        */
        TypeScriptProject.prototype.getReferencedOrImportedFiles = function (path) {
            if (!this.projectScripts.has(path)) {
                return [];
            }
            var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, new script.ScriptSnapshot(this.projectScripts.get(path)));
            return preProcessedFileInfo.referencedFiles.map(function (fileReference) {
                return PathUtils.makePathAbsolute(fileReference.path, path);
            }).concat(preProcessedFileInfo.importedFiles.map(function (fileReference) {
                return PathUtils.makePathAbsolute(fileReference.path + '.ts', path);
            }));
        };

        /**
        * add a reference
        * @param path the path of the file referencing anothe file
        * @param referencedPath the path of the file referenced
        */
        TypeScriptProject.prototype.addReference = function (path, referencedPath) {
            if (!this.references.has(referencedPath)) {
                this.references.set(referencedPath, new collections.StringSet());
            }
            this.references.get(referencedPath).add(path);
        };

        /**
        * remove a reference
        * @param path the path of the file referencing anothe file
        * @param referencedPath the path of the file referenced
        */
        TypeScriptProject.prototype.removeReference = function (path, referencedPath) {
            var fileRefs = this.references.get(referencedPath);
            if (!fileRefs) {
                this.removeFile(referencedPath);
            }
            fileRefs.remove(path);
            if (fileRefs.values.length === 0) {
                this.references.delete(referencedPath);
                this.removeFile(referencedPath);
            }
        };

        TypeScriptProject.prototype.updateReferences = function (path, oldPaths) {
            var _this = this;
            this.getReferencedOrImportedFiles(path).forEach(function (referencedPath) {
                oldPaths.remove(referencedPath);
                if (!_this.projectScripts.has(referencedPath)) {
                    _this.addFile(referencedPath);
                    _this.addReference(path, referencedPath);
                }
            });

            oldPaths.values.forEach(function (referencedPath) {
                _this.removeReference(path, referencedPath);
            });
        };

        //-------------------------------
        //  TypeScript Objects
        //-------------------------------
        /**
        * create compilation settings from project config
        */
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
            compilationSettings.codeGenTarget = this.config.target.toLowerCase() === 'es3' ? 0 /* EcmaScript3 */ : 1 /* EcmaScript5 */;

            compilationSettings.moduleGenTarget = moduleType === 'none' ? 0 /* Unspecified */ : (moduleType === 'amd' ? 2 /* Asynchronous */ : 1 /* Synchronous */);
            return compilationSettings;
        };

        /**
        * create the language service according to the file
        */
        TypeScriptProject.prototype.createLanguageService = function () {
            this.languageServiceHost = new language.LanguageServiceHost(this.compilationSettings, this.projectScripts);
            this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
        };

        //-------------------------------
        //  Default Library
        //-------------------------------
        /**
        * add the default library
        */
        TypeScriptProject.prototype.addDefaultLibrary = function () {
            return this.addFile(utils.DEFAULT_LIB_LOCATION);
        };

        /**
        * add the default library
        */
        TypeScriptProject.prototype.removeDefaultLibrary = function () {
            this.removeFile(utils.DEFAULT_LIB_LOCATION);
        };

        //-------------------------------
        //  Services Notification
        //-------------------------------
        /**
        * notify the project services that a file has been added
        * @param path the path of the file that has been added
        */
        TypeScriptProject.prototype.notifyFileAdded = function (path) {
            var _this = this;
            immediate.clearImmediate(this.immediateId);
            this.delta.fileAdded.push(path);
            this.immediateId = immediate.setImmediate(function () {
                return _this.notiFyService();
            });
        };

        /**
        * notify the project services that a file has been deleted
        * @param path the path of the file that has been deleted
        */
        TypeScriptProject.prototype.notifyFileDeleted = function (path) {
            var _this = this;
            immediate.clearImmediate(this.immediateId);
            this.delta.fileDeleted.push(path);
            this.immediateId = immediate.setImmediate(function () {
                return _this.notiFyService();
            });
        };

        /**
        * notify the project services that a file has been deleted
        * @param path the path of the file that has been updated
        */
        TypeScriptProject.prototype.notifyFileUpdated = function (path) {
            var _this = this;
            if (this.delta.fileUpdated.indexOf(path) === -1) {
                immediate.clearImmediate(this.immediateId);
                this.delta.fileUpdated.push(path);
                this.immediateId = immediate.setImmediate(function () {
                    return _this.notiFyService();
                });
            }
        };

        /**
        * notify the services of the current delta
        */
        TypeScriptProject.prototype.notiFyService = function () {
            var _this = this;
            Object.freeze(this.delta);
            this.services.forEach(function (service) {
                return service.run(false, _this.delta);
            });
            this.delta = {
                fileDeleted: [],
                fileAdded: [],
                fileUpdated: []
            };
        };
        return TypeScriptProject;
    })();
    exports.TypeScriptProject = TypeScriptProject;
});
