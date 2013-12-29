//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.



import fs = require('./fileSystem');
import ws = require('./workingSet');
import utils = require('./typeScriptUtils');
import collections = require('../commons/collections');
import immediate = require('./utils/immediate');
import TypeScriptService = require('./typeScriptService');


//--------------------------------------------------------------------------
//
//  ProjectService
//
//--------------------------------------------------------------------------

/**
 * represent delta of resources that changed in a project
 */
export interface ProjectResourceDelta {
    fileDeleted: string[];
    fileAdded: string[];
    fileUpdated: string[];
}

/**
 * Service attached to TypeScriptProject those service perform tasks that must be run
 * when the project is reinitialized ord when the projects files changed
 */
export interface ProjectService {
    run(refresh: boolean, resourcesDelta: ProjectResourceDelta): void;
    dispose(): void;
}

/**
 * factory for ProjectService
 */
export interface ProjectServiceFactory {
    (project: ITypeScriptProject): ProjectService
}



//--------------------------------------------------------------------------
//
//  TypeScriptProjectConfig
//
//--------------------------------------------------------------------------

/**
 * the TypeScript project config file interface
 */
export interface TypeScriptProjectConfig {
    sources?: string[];
    compileOnSave?: boolean;
    
    
    ///Compiler Settings
    propagateEnumConstants?: boolean;
    removeComments?: boolean;
    noLib?: boolean;
    target?: string;
    module?: string;
    outFile?: string;
    outDir?: string;
    mapSource?: boolean;
    mapRoot?: string;
    sourceRoot?: string;
    declaration?: boolean;
    useCaseSensitiveFileResolution?: boolean;
    allowImportModule?: boolean;
    noImplicitAny?: boolean;
}


//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------


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

/**
 * represent a typescript project
 */
export interface ITypeScriptProject {
    /**
     * initlialize
     * @param services
     */
    init(services?: ProjectService[]): void;
    
    
    /**
     * rinitialize the project
     */
    reset(): void;
    
    /**
     * return  the compilation settings extracted from the project config file
     */
    getCompilationSettings(): TypeScript.CompilationSettings;
    
    
    /**
     * get compilations settings
     */
    getScripts(): collections.StringSet;
    
 
    /**
     * dispose the project
     */
    dispose(): void;
    
    /**
     * update the project config
     * @param config
     */
    update(config: TypeScriptProjectConfig): void;
    
    /**
     * for a given path, give the relation between the project an the associated file
     * @param path
     */
    getProjectFileKind(path: string): ProjectFileKind;
}

/**
 * class representing a typescript project, responsible of synchronizing 
 * languageServiceHost with the file system
 */
export class TypeScriptProject implements ITypeScriptProject {
    
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
        private fileSystem: fs.IFileSystem,
        private workingSet: ws.IWorkingSet
    ) {
        this.typeScriptService = new TypeScriptService();
    }
    
    //-------------------------------
    //  variables
    //-------------------------------
    
    
    /**
     * the compilation settings extracted from the project config file
     */
    
    private compilationSettings: TypeScript.CompilationSettings;
    
    /**
     * Map path to content
     */
    private projectFiles: collections.StringSet;
    
   
   
    /**
     * track of the initialized state of the project
     */
    private initialized: boolean;
    
    /**
     * services attached to this project
     */
    private services: ProjectService[]
    
    /**
     * TypeScript service
     */
    private typeScriptService: TypeScriptService;
    
    
    /**
     * Reference manager
     */
    private referencesManager: ReferencesManager;
    
    
    /**
     * @private
     */
    private immediateId: number;
    
    
    /**
     * current stored delta before notification
     */
    private delta: ProjectResourceDelta = {
        fileDeleted: [],
        fileAdded: [],
        fileUpdated: []
    }
    
    
    //-------------------------------
    //  public method
    //-------------------------------
    
    /**
     * initlialize
     * @param services
     */
    init(services?: ProjectService[]) {
        this.services = services || [];
        this.internalInit();
    }
    
    
    /**
     * rinitialize the project
     */
    reset() {
        this.internalInit();
    }
    
    /**
     * return  the compilation settings extracted from the project config file
     */
    getCompilationSettings() {
        return this.compilationSettings;
    }
    
    
    /**
     * get compilations settings
     */
    getScripts() {
        return this.projectFiles;
    }

    /**
     * dispose the project
     */
    dispose(): void {
        this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
        this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
        this.workingSet.documentEdited.remove(this.documentEditedHandler);
    }
    
    /**
     * update the project config
     * @param config
     */
    update(config: TypeScriptProjectConfig): void {
        this.config = config;
        this.reset();
    }
    
    /**
     * for a given path, give the relation between the project an the associated file
     * @param path
     */
    getProjectFileKind(path: string): ProjectFileKind {
        if (this.projectFiles.has(path)) {
            return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE :  ProjectFileKind.REFERENCE;
        } else {
            return ProjectFileKind.NONE
        }
    }
    
    
    //-------------------------------
    //  private methods
    //-------------------------------
    
    /**
     * initialize the project
     */
    private internalInit() {
        this.initialized = false;
        this.projectFiles = new collections.StringSet();
        this.referencesManager = new ReferencesManager();
        
        
        this.compilationSettings =  this.createCompilationSettings();
        this.typeScriptService.init(this.compilationSettings);
        
        this.collectFiles().then(() => {
            this.workingSet.files.forEach(path => this.typeScriptService.setScriptIsOpen(path, true));
            this.services.forEach(service => service.run(true, null));
            this.initialized = true;
        },() => { 
            //TODO handle errors;
            console.log('Errors in collecting project files');
        });
    }
    
    
    
    
    //-------------------------------
    //  Project Files managment
    //-------------------------------
    
    /**
     * retrive files content for path described in the config
     */
    private collectFiles(): JQueryPromise<void> {
        var promises: JQueryPromise<{ key: string; value: string; }>[] =  [] ;
        if (!this.config.noLib) {
            promises.push(this.addFile(utils.DEFAULT_LIB_LOCATION));
        } 
        return this.fileSystem.getProjectFiles().then(paths => {
            var fileEntries: collections.MapEntry<string>[] = [];
            paths.forEach(path => {
                if (this.isProjectSourceFile(path)) {
                    promises.push(this.addFile(path, false));
                }
            });
            return $.when.apply($, promises);
        });
    }
    
  
    
    /**
     * add a file to the project
     * @param path
     */
    private addFile(path: string, notify = true): JQueryPromise<void>  {
        if (!this.projectFiles.has(path)) {
            this.projectFiles.add(path);
            return this.fileSystem.readFile(path).then<void>(content => {
                this.typeScriptService.addScript(path, content);
                
                if (notify) {
                    this.notifyFileAdded(path);
                }
                
                return this.typeScriptService.getReferencedFiles(path).then(referencedFiles => {
                    var promises: JQueryPromise<any>[] = [];
                    referencedFiles.forEach(referencedFile => {
                        this.referencesManager.addReference(path, referencedFile);
                        promises.push(this.addFile(referencedFile));
                    });
                    return $.when.apply($, promises);
                });
            }, () => {
                this.projectFiles.remove(path);
            });
        }
    }
    
    /**
     * remove a file from the project
     * @param path
     */
    private removeFile(path: string): void {
        if (this.projectFiles.has(path)) {
            this.typeScriptService.removeScript(path);
            this.notifyFileDeleted(path);
            
            var references = this.referencesManager.getFileReferences(path);
            if (references) {
                references.forEach(reference => {
                    this.referencesManager.removeReference(path, reference);
                    if (!this.referencesManager.hasFileReferencing(reference) && !this.isProjectSourceFile(reference)) {
                        this.removeFile(reference);
                    }
                });
            }
        } 
        return;
    }
    
    /**
     * update a project file
     * @param path
     */
    private updateFile(path: string) {
        this.fileSystem.readFile(path).then(content => {
            this.typeScriptService.updateScript(path, content);
            this.updateReferences(path);
        }, () => {
            this.removeFile(path);    
        });
    }
    
    
    private updateReferences(path: string): void {
        var oldReferences = new collections.StringSet(this.referencesManager.getFileReferences(path));
        this.typeScriptService.getReferencedFiles(path).then(references => {
            references.forEach(referencedFile => {
                if (!oldReferences.has(referencedFile)) {
                    this.addFile(referencedFile);
                    this.referencesManager.addReference(path, referencedFile);
                } else {
                    oldReferences.remove(referencedFile);
                }    
            });
            oldReferences.values.forEach(referencedFile => {
                this.referencesManager.removeReference(path, referencedFile);
                if (!this.referencesManager.hasFileReferencing(referencedFile) && !this.isProjectSourceFile(referencedFile)) {
                    this.removeFile(referencedFile);
                }
            });
        });
    }
    
    /**
     * return true a if a given file path match the config
     * @param path
     */
    private isProjectSourceFile(path: string): boolean {
        path = PathUtils.makePathRelative(path, this.baseDirectory);
        return this.config.sources.some(pattern => utils.minimatch(path, pattern));
    }
    
   
    
    //-------------------------------
    //  CompilationSettings
    //-------------------------------
 
    /**
     * create compilation settings from project config
     */
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
   
    
  
    //-------------------------------
    //  Services Notification
    //-------------------------------
    
    
    /**
     * notify the project services that a file has been added
     * @param path the path of the file that has been added
     */
    private notifyFileAdded(path: string) {
        immediate.clearImmediate(this.immediateId);
        this.delta.fileAdded.push(path);
        this.immediateId = immediate.setImmediate(() => this.notiFyService());
    }
    
    /**
     * notify the project services that a file has been deleted
     * @param path the path of the file that has been deleted
     */
    private notifyFileDeleted(path: string) {
        immediate.clearImmediate(this.immediateId);
        this.delta.fileDeleted.push(path);
        this.immediateId = immediate.setImmediate(() => this.notiFyService());
    }
    
    /**
     * notify the project services that a file has been deleted
     * @param path the path of the file that has been updated
     */
    private notifyFileUpdated(path: string) {
        if(this.delta.fileUpdated.indexOf(path) === -1) {
            immediate.clearImmediate(this.immediateId);
            this.delta.fileUpdated.push(path);
            this.immediateId = immediate.setImmediate(() => this.notiFyService());
        }
    }
    
    /**
     * notify the services of the current delta
     */
    private notiFyService() {
        Object.freeze(this.delta)
        this.services.forEach(service => service.run(false, this.delta));
        this.delta = {
            fileDeleted: [],
            fileAdded: [],
            fileUpdated: []
        };
    }
    
    
     
    
    
    //-------------------------------
    //  Events Handler
    //-------------------------------
    
    private addListeners(): void {
        this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
        this.workingSet.documentEdited.add(this.documentEditedHandler);
        this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
    }
    
    private removeListeners(): void {
        this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
        this.workingSet.documentEdited.add(this.documentEditedHandler);
        this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
    }
    
    
    /**
     * handle changes in the fileSystem
     */
    private filesChangeHandler = (changeRecords: fs.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fs.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.path) || this.referencesManager.hasFileReferencing(record.path)) {
                        this.addFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.DELETE:
                    if (this.projectFiles.has(record.path)) {
                        this.removeFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.UPDATE:
                    if (this.projectFiles.has(record.path)) {
                        this.updateFile(record.path);
                    }
                    break;
            }
        });
    }
    
    /**
     * handle changes in the workingSet
     */
    private workingSetChangedHandler = (changeRecord:  ws.ChangeRecord) => {
        switch (changeRecord.kind) { 
            case ws.WorkingSetChangeKind.ADD:
                changeRecord.paths.forEach((path: string) => {
                    if (this.projectFiles.has(path)) {
                        this.typeScriptService.setScriptIsOpen(path, true);
                    }
                });
                break;
            case ws.WorkingSetChangeKind.REMOVE:
                changeRecord.paths.forEach((path: string) => {
                    if (this.projectFiles.has(path)) {
                        this.typeScriptService.setScriptIsOpen(path, false);
                    }
                });
                break;
        }
    }
    
    /**
     * handle document edition
     */
    private documentEditedHandler = (records: ws.DocumentChangeDescriptor[]) => {
        records.forEach((record: ws.DocumentChangeDescriptor) => {
            if (this.projectFiles.has(record.path)) {
                if (!record.from || !record.to) {
                    this.typeScriptService.updateScript(record.path, record.documentText);
                } else {
                    this.typeScriptService.editScript(record.path, record.from, record.to, record.text);
                }
                this.updateReferences(record.path);
            }
        });
    }
}


class ReferencesManager {
    
    /**
     * store file references : referencedFiles -> file referencing
     */
    private referencedToReferencing = new collections.StringMap<collections.StringSet>();
    
    /**
     * store file references :  file referencing -> referencedFiles
     */
    private referencingToReferenced = new collections.StringMap<collections.StringSet>();
    
    
    public hasFileReferencing(file: string): boolean {
        return this.referencedToReferencing.has(file);
    }
    
    public getFileReferencing(file: string): string[] {
        var fileReferencing = this.referencedToReferencing.get(file);
        return fileReferencing && fileReferencing.values;
    }
    
    public getFileReferences(file: string): string[] {
        var fileReferenced = this.referencingToReferenced.get(file);
        return fileReferenced && fileReferenced.values;
    }
    
    /**
     * add a reference 
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    public addReference(file: string, referencedFile: string) {
        if (!this.referencedToReferencing.has(referencedFile)) {
            this.referencedToReferencing.set(referencedFile, new collections.StringSet());
        }
        if (!this.referencingToReferenced.has(file)) {
            this.referencingToReferenced.set(file, new collections.StringSet());
        }
        this.referencedToReferencing.get(referencedFile).add(file)
        this.referencingToReferenced.get(file).add(referencedFile)
    }
    
    /**
     * remove a reference
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    public removeReference(file: string, referencedFile: string): void {
        var fileReferencing = this.referencedToReferencing.get(referencedFile),
            fileReferenced = this.referencingToReferenced.get(file);
        
        if (!fileReferencing || !fileReferenced) {
            return;
        }
        
        fileReferencing.remove(file);
        fileReferenced.remove(referencedFile);
        
        if (fileReferencing.values.length === 0) {
            this.referencedToReferencing.delete(referencedFile);
        }
        
        if (fileReferenced.values.length === 0) {
            this.referencingToReferenced.delete(file);
        }
    }

}


