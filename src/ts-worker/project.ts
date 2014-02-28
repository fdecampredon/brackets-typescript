'use strict';

import Rx = require('rx');
import path = require('path');
import minimatch = require('minimatch');
import Services = TypeScript.Services;

import collections = require('../commons/collections');
import fs = require('../commons/fileSystem');
import ws = require('../commons/workingSet');
import logger = require('../commons/logger');
import TypeScriptProjectConfig = require('../commons/config');

import LanguageServiceHost = require('./languageServiceHost');



//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------


/**
 * class representing a typescript project, responsible of synchronizing 
 * languageServiceHost with the file system
 */
class TypeScriptProject {
    
    //-------------------------------
    //  constructor
    //-------------------------------
     
    /**
     * @param baseDirectory the baseDirectory of the project
     * @param config the project config file
     * @param fileSystem the fileSystem wrapper used by the project
     * @param workingSet the working set wrapper used by the project
     */
    constructor(
        private baseDirectory: string,
        private config: TypeScriptProjectConfig, 
        private fileSystem: fs.FileSystem,
        private workingSet: ws.WorkingSet,
        private servicesFactory: Services.TypeScriptServicesFactory,
        private defaultLibLocation: string
    ) {}
    
    //-------------------------------
    //  variables
    //-------------------------------
    
    private coreService: Services.CoreServices;
    
    private languageServiceHost: LanguageServiceHost;
    
    private languageService: Services.ILanguageService;
    
    /**
     * Map path to content
     */
    private projectFilesSet: collections.StringSet;
    
    /**
     * store file references
     */
    private references: collections.StringMap<collections.StringSet>;
    
    private disposables: Rx.IDisposable[] = [];
    
    //-------------------------------
    //  public methods
    //-------------------------------
    
    init(): JQueryPromise<void> {
        this.coreService = this.servicesFactory.createCoreServices({ logger: new logger.LogingClass()});
        this.languageServiceHost = new LanguageServiceHost();
        this.languageServiceHost.setCompilationSettings(this.createCompilationSettings());
        this.languageService = this.servicesFactory.createPullLanguageService(this.languageServiceHost);
        return this.collectFiles().then(() => {
            this.workingSet.getFiles().then((files) => files.forEach(fileName => {
                if (this.projectFilesSet.has(fileName)) {
                    this.languageServiceHost.setScriptIsOpen(fileName, true);
                }
            }));
            
            this.disposables.push(
                this.workingSet.workingSetChanged.subscribe(this.workingSetChangedHandler),
                this.workingSet.documentEdited.subscribe(this.documentEditedHandler),
                this.fileSystem.projectFilesChanged.subscribe(this.filesChangeHandler)
            );
            if (!this.config.noLib) {
                return this.addDefaultLibrary();
            }
        }, () => { 
            //todo error recovery
            if (logger.fatal()) {
                logger.log('could not retrieve project files');
            }
        });
    }
    
    public dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
    }
    
    
    
    //-------------------------------
    //  exposed services
    //-------------------------------
    
    /**
     * language service host of the project
     */
    getLanguageServiceHost(): LanguageServiceHost {
        return this.languageServiceHost;
    }
    
    /**
     * core service used by the project
     */
    getCoreService(): Services.CoreServices {
        return this.coreService;
    }
    
    /**
     * languageService used by the project
     */
    getLanguageService(): Services.ILanguageService {
        return this.languageService;
    }
    
    /**
     * return the set of files contained in the project
     */
    getProjectFilesSet() {
        return new collections.StringSet(this.projectFilesSet.values);
    }
    
    //-------------------------------
    //  private methods
    //-------------------------------
    
     private createCompilationSettings() : TypeScript.CompilationSettings {
        var compilationSettings = new TypeScript.CompilationSettings(),
            moduleType = this.config.module.toLowerCase();
        compilationSettings.propagateEnumConstants = this.config.propagateEnumConstants;
        compilationSettings.removeComments = this.config.removeComments;
        compilationSettings.noLib = this.config.noLib;
        compilationSettings.noImplicitAny = this.config.noImplicitAny;
        compilationSettings.outFileOption = this.config.outFile || '';
        compilationSettings.outDirOption = this.config.outDir || '' ;
        compilationSettings.mapSourceFiles = this.config.mapSource;
        compilationSettings.sourceRoot = this.config.sourceRoot || '';
        compilationSettings.mapRoot = this.config.mapRoot || '';
        compilationSettings.useCaseSensitiveFileResolution = this.config.useCaseSensitiveFileResolution;
        compilationSettings.generateDeclarationFiles = this.config.declaration;
        compilationSettings.generateDeclarationFiles = this.config.declaration;
        compilationSettings.generateDeclarationFiles = this.config.declaration;
        compilationSettings.codeGenTarget = this.config.target.toLowerCase() === 'es3' ? 
                                                    TypeScript.LanguageVersion.EcmaScript3 : 
                                                    TypeScript.LanguageVersion.EcmaScript5;
        
        compilationSettings.moduleGenTarget = moduleType === 'none' ? 
                                                    TypeScript.ModuleGenTarget.Unspecified : 
                                                    (  moduleType === 'amd' ?
                                                        TypeScript.ModuleGenTarget.Asynchronous:
                                                        TypeScript.ModuleGenTarget.Synchronous );
        return compilationSettings
    }
    
    /**
     * for a given path, give the relation between the project an the associated file
     * @param path
     */
    getProjectFileKind(fileName: string): TypeScriptProject.ProjectFileKind {
        if (this.projectFilesSet.has(fileName)) {
            return this.isProjectSourceFile(fileName) ? TypeScriptProject.ProjectFileKind.SOURCE :  TypeScriptProject.ProjectFileKind.REFERENCE;
        } else {
            return TypeScriptProject.ProjectFileKind.NONE
        }
    }
    
    //-------------------------------
    //  Project Files Management
    //-------------------------------
    
    /**
     * retrive files content for path described in the config
     */
    private collectFiles(): JQueryPromise<void> { 
        this.projectFilesSet = new collections.StringSet();
        this.references = new collections.StringMap<collections.StringSet>();
        return this.fileSystem.getProjectFiles().then((paths: string[]) => {
            var promises: JQueryPromise<any>[] = [];
            paths.forEach(fileName => {
                if (this.isProjectSourceFile(fileName)) {
                    promises.push(this.addFile(fileName, false));
                }
            });
            return $.when.apply($, promises);
        });
    }
    
    /**
     * return true a if a given file path match the config
     * @param path
     */
    private isProjectSourceFile(fileName: string): boolean {
        fileName = path.relative(this.baseDirectory, fileName);
        return this.config.sources.some(pattern => minimatch(fileName, pattern));
    }
    
   
    /**
     * add a file to the project
     * @param path
     */
    private addFile(fileName: string, notify = true): JQueryPromise<void>  {
        if (!this.projectFilesSet.has(fileName)) {
            this.projectFilesSet.add(fileName);
            this.fileSystem.readFile(fileName).then(content => {
                var promises: JQueryPromise<any>[] = [];
                this.languageServiceHost.addScript(fileName, content);
                this.getReferencedOrImportedFiles(fileName).forEach((referencedFile: string) => {
                    promises.push(this.addFile(referencedFile));
                    this.addReference(fileName, referencedFile);
                });
                return $.when.apply($, promises);
            }, () => {
                this.projectFilesSet.remove(fileName);
            });
        }
        return null;
    }
    
    
    /**
     * remove a file from the project
     * @param path
     */
    private removeFile(fileName: string) {
        if (this.projectFilesSet.has(fileName)) {
            this.getReferencedOrImportedFiles(fileName).forEach((referencedPath: string) => {
                this.removeReference(fileName, referencedPath);
            });
            this.projectFilesSet.remove(fileName);
        }
    }
    
    /**
     * update a project file
     * @param path
     */
    private updateFile(fileName: string) {
        this.fileSystem.readFile(fileName).then(content => {
            var oldPaths = new collections.StringSet(this.getReferencedOrImportedFiles(fileName));
            this.languageServiceHost.updateScript(fileName, content);
            this.updateReferences(fileName, oldPaths);
        });
    }
    
    
    /**
     * add the default library
     */
    private addDefaultLibrary() {
        return this.addFile(this.defaultLibLocation)
    }
    
    
    //-------------------------------
    //  References
    //-------------------------------
    
    /**
     * for a given file retrives the file referenced or imported by this file
     * @param path
     */
    private getReferencedOrImportedFiles(fileName: string): string[] {
        if (!this.projectFilesSet.has(fileName)) {
            return []
        }
        var preProcessedFileInfo = this.coreService.getPreProcessedFileInfo(fileName, this.languageServiceHost.getScriptSnapshot(fileName)),
            dir = path.dirname(fileName);
        
        return preProcessedFileInfo.referencedFiles.map(fileReference => {
            return path.resolve(dir, fileReference.path);
        }).concat(preProcessedFileInfo.importedFiles.map(fileReference => {
            return path.resolve(dir, fileReference.path + '.ts');
        }));
    }
    
    /**
     * add a reference 
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private addReference(fileName: string, referencedPath: string) {
        if (!this.references.has(referencedPath)) {
            this.references.set(referencedPath, new collections.StringSet());
        }
        this.references.get(referencedPath).add(fileName)
    }
    
    /**
     * remove a reference
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private removeReference(fileName: string, referencedPath: string) {
        var fileRefs = this.references.get(referencedPath);
        if (!fileRefs) {
            this.removeFile(referencedPath);
        }
        fileRefs.remove(fileName);
        if (fileRefs.values.length === 0) {
            this.references.delete(referencedPath);
            this.removeFile(referencedPath);
        }   
    }
    
    
    private updateReferences(fileName: string, oldPaths: collections.StringSet) {
        this.getReferencedOrImportedFiles(fileName).forEach(referencedPath => {
            oldPaths.remove(referencedPath);
            if (!this.projectFilesSet.has(referencedPath)) {
                this.addFile(referencedPath);
                this.addReference(fileName, referencedPath);
            }
        });
        
        oldPaths.values.forEach(referencedPath => this.removeReference(fileName, referencedPath));
    }
    
    
    //-------------------------------
    //  Events Handler
    //-------------------------------
    
    /**
     * handle changes in the fileSystem
     */
    private filesChangeHandler = (changeRecords: fs.FileChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fs.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.path) || this.references.has(record.path)) {
                        this.addFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.DELETE:
                    if (this.projectFilesSet.has(record.path)) {
                        this.removeFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.UPDATE:
                    if (this.projectFilesSet.has(record.path)) {
                        this.updateFile(record.path);
                    }
                    break;
            }
        });
    }
    
    /**
     * handle changes in the workingSet
     */
    private workingSetChangedHandler = (changeRecord:  ws.WorkingSetChangeRecord) => {
        switch (changeRecord.kind) { 
            case ws.WorkingSetChangeKind.ADD:
                changeRecord.paths.forEach(fileName  => {
                    if (this.projectFilesSet.has(fileName)) {
                        this.languageServiceHost.setScriptIsOpen(fileName, true);
                    }
                });
                break;
            case ws.WorkingSetChangeKind.REMOVE:
                changeRecord.paths.forEach(fileName  => {
                    if (this.projectFilesSet.has(fileName)) {
                        this.languageServiceHost.setScriptIsOpen(fileName, false);
                        this.updateFile(fileName);
                    }
                });
                break;
        }
    }
    
    /**
     * handle document edition
     */
    private documentEditedHandler = (records: ws.DocumentChangeDescriptor[]) => {
        records.forEach(record => {
            if (this.projectFilesSet.has(record.path)) {
                var oldPaths = new collections.StringSet(this.getReferencedOrImportedFiles(record.path));
                   
                if (!record.from || !record.to) {
                    this.languageServiceHost.updateScript(record.path, record.documentText);
                } else {
                    var minChar = this.languageServiceHost.getIndexFromPos(record.path, record.from),
                        limChar = this.languageServiceHost.getIndexFromPos(record.path, record.to);
                    
                    this.languageServiceHost.editScript(record.path, minChar, limChar, record.text);
                }
                
                this.updateReferences(record.path, oldPaths);
            }
        });
    }
}

module TypeScriptProject {
    /**
     * enum describing the type of file ib a project
     */
    export enum ProjectFileKind {
        /**
         * the file is not a part of the project
         */
        NONE,
        /**
         * the file is a source file of the project
         */
        SOURCE,
        /**
         * the file is referenced by a source file of the project
         */
        REFERENCE
    }
    
    
    
    
    export function projectFactory(
        baseDirectory: string,
        config: TypeScriptProjectConfig, 
        fileSystem: fs.FileSystem,
        workingSet: ws.WorkingSet,
        servicesFactory: Services.TypeScriptServicesFactory,
        defaultLibLocation: string
    ) {
        return new TypeScriptProject(baseDirectory, config, fileSystem, workingSet, servicesFactory, defaultLibLocation);
    }
}

export = TypeScriptProject;
