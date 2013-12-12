import fs = require('./fileSystem');
import ws = require('./workingSet');
import coreService = require('./typescript/coreService');
import script = require('./typescript/script');
import language = require('./typescript/language');
import utils = require('./typeScriptUtils');
import collections = require('./utils/collections');
import immediate = require('./utils/immediate');
import Services = TypeScript.Services;



//--------------------------------------------------------------------------
//
//  TypeScriptProjectManager
//
//--------------------------------------------------------------------------



/**
 * The main facade class of the extentions, responsible to create / destroy / update projects
 * by observing config files in the files of the opened brackets folder
 */
export class TypeScriptProjectManager {
    
    //-------------------------------
    //  constructor
    //-------------------------------
    
    /**
     * @param fileSystem the fileSystem wrapper used by the projectManager
     * @param workingSet the working set wrapper used by the projectManager
     */
    constructor(
        private fileSystem: fs.IFileSystem, 
        private workingSet: ws.IWorkingSet
    ) {}
    
    //-------------------------------
    //  variables
    //-------------------------------
    
    /**
     * a map containing the projects 
     */
    private projectMap = new collections.StringMap<TypeScriptProject>();
    
    /**
     * a map containing the projects 
     */
    private servicesFactory: ProjectServiceFactory[] = [];
    
    //-------------------------------
    // Public methods
    //------------------------------- 
    
    
    /**
     * initialize the project manager
     */
    init(): void {
        this.createProjects();
        this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
    }
    
    
    registerService(serviceFactory: ProjectServiceFactory) {
        this.servicesFactory.push(serviceFactory);
    }
    
    /**
     * dispose the project manager
     */
    dispose(): void {
        this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
        this.disposeProjects();
        
    }
    
    /**
     * this method will try to find a project referencing the given path
     * it will by priority try to retrive project that have that file as part of 'direct source'
     * before returning projects that just have 'reference' to this file
     * 
     * @param path the path of the typesrcript file for which project are looked fo
     */
    getProjectForFile(path: string): TypeScriptProject {
        var projects = this.projectMap.values,
            project : TypeScriptProject = null;
        //first we check for a project that have tha file as source 
        projects.some(tsProject  => {
            if (tsProject.getProjectFileKind(path) === ProjectFileKind.SOURCE) {
                project = tsProject;
                return true;
            }
        });
        
        if (!project) {
            projects.some(tsProject  => {
                if (tsProject.getProjectFileKind(path) === ProjectFileKind.REFERENCE) {
                    project = tsProject;
                    return true;
                }
            });
        }
        
        //TODO return a kind of "single file project" if no project are found
        return project;
    }
    
    //-------------------------------
    //  Private methods
    //------------------------------- 
    
    /**
     * find bracketsTypescript config files and create a project for each file founds
     */
    private createProjects():void {
        this.fileSystem.getProjectFiles().then((paths: string[]) => {
            paths
                .filter(utils.isTypeScriptProjectConfigFile)
                .forEach(this.createProjectFromFile, this);     
        });
    }
    
    /**
     * dispose every projects created by the project Manager
     */
    private disposeProjects():void {
        var projectMap = this.projectMap;
        projectMap.keys.forEach(path =>  projectMap.get(path).dispose())
        this.projectMap.clear();
    }
    
    /**
     * for a given config file create a project
     * 
     * @param configFilePath the config file path
     */
    private createProjectFromFile(configFilePath: string) {
        this.retrieveConfig(configFilePath).then( config => this.createProjectFromConfig(configFilePath, config));
    }
    
    /**
     * for given validated config and config file path create a project
     * 
     * @param configFilePath the config file path
     * @param config the config created from the file
     */
    private createProjectFromConfig(configFilePath: string, config : TypeScriptProjectConfig) {
        if (config) {
            var project = this.newProject(PathUtils.directory(configFilePath), config)
            project.init(this.servicesFactory.map(serviceFactory => serviceFactory(project)));
            this.projectMap.set(configFilePath, project);
        } 
    }


    private newProject(baseDir: string, config: TypeScriptProjectConfig) {
        return new TypeScriptProject(baseDir, config, this.fileSystem, this.workingSet);
    }
    
    /**
     * try to create a config from a given config file path
     * validate the config file, then add default values if needed
     * 
     * @param configFilePath
     */
    private retrieveConfig(configFilePath: string): JQueryPromise<TypeScriptProjectConfig> {
        return this.fileSystem.readFile(configFilePath).then((content: string) => {
            var config : TypeScriptProjectConfig;
            try {
                config =  JSON.parse(content);
            } catch(e) {
                //TODO logging strategy
                console.log('invalid json for brackets-typescript config file: ' + configFilePath);
            }
            
            if(config) {
                for (var property in utils.typeScriptProjectConfigDefault) {
                    if (!config.hasOwnProperty(property)) {
                        config[property] = utils.typeScriptProjectConfigDefault[property]
                    }
                }
                if(!utils.validateTypeScriptProjectConfig(config)) {
                    config = null;
                }
            }
            return config; 
        });
    }
    
    
    //-------------------------------
    //  Events Handler
    //------------------------------- 
    
    
    /**
     * handle changes in the file system, update / delete / create project accordingly
     */
    private filesChangeHandler = (changeRecords: fs.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            if (record.kind === fs.FileChangeKind.RESET) {
                //reinitialize the projects if file system reset
                this.disposeProjects();
                this.createProjects();
                return false;
            } else if (utils.isTypeScriptProjectConfigFile(record.path)) {
                switch (record.kind) { 
                    // a config file has been deleted detele the project
                    case fs.FileChangeKind.DELETE:
                        if (this.projectMap.has(record.path)) {
                            this.projectMap.get(record.path).dispose();
                            this.projectMap.delete(record.path);
                        }
                        break;
                        
                    // a config file has been created create a new project
                    case fs.FileChangeKind.ADD:
                        this.createProjectFromFile(record.path);
                        break;
                        
                    case fs.FileChangeKind.UPDATE:
                        this.retrieveConfig(record.path).then((config : TypeScriptProjectConfig) => {
                            if (config) {
                                if(this.projectMap.has(record.path)) {
                                    //config file has been updated create the project
                                    this.projectMap.get(record.path).update(config);
                                } else {
                                    // this config file was already present, but was invalid, now create the project
                                    // with the obtained valid config file
                                    this.createProjectFromConfig(record.path, config);
                                }
                            }
                        });
                        break;
                }
            }
            return true;
        }); 
    }
}



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
//  TypeScriptProject
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

/**
 * describe the factotry used to create a language service
 */
export interface LanguageServiceHostFactory {
    (settings: TypeScript.CompilationSettings, files:  { [path: string]: string }): language.LanguageServiceHost;
}

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
    getScripts(): collections.StringMap<script.ScriptInfo>;
    
    /**
     * return the language service associated to this project
     */
    getLanguageService(): Services.ILanguageService;
 
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
    
    /**
     * return an index from a positon in line/char
     * @param path the path of the file
     * @param position the position
     */
    getIndexFromPos(path: string, position: ws.Position): number;
    
    
    /**
     * return a positon in line/char from an index
     * @param path the path of the file
     * @param index the index
     */
    indexToPosition(path: string, index: number): ws.Position;

    /**
     * retrive all files dependant of a given file
     * @param path the path of the given file
     */
    getFilesDependantOfFile(path: string): string[];
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
    ) {}
    
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
    private projectScripts: collections.StringMap<script.ScriptInfo>;//{ [path: string]: string };
    
    /**
     * store file references
     */
    private references: collections.StringMap<collections.StringSet>;
    
    /**
     * a set containing path of file referenced but not found
     */
    private missingFiles: collections.StringSet;
    
    /**
     * the language service host associated to this project
     */
    private languageServiceHost: language.LanguageServiceHost;
    
    /**
     * the language service associated to this project
     */
    private languageService: Services.ILanguageService;
    
    /**
     * track of the initialized state of the project
     */
    private initialized: boolean;
    
    /**
     * services attached to this project
     */
    private services: ProjectService[]
    
    
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
        this.dispose();
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
        return this.projectScripts;
    }
    
    /**
     * return the language service associated to this project
     */
    getLanguageService(): Services.ILanguageService {
        return this.languageService;
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
        if (this.projectScripts.has(path)) {
            return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE :  ProjectFileKind.REFERENCE;
        } else {
            return ProjectFileKind.NONE
        }
    }
    
    /**
     * return an index from a positon in line/char
     * @param path the path of the file
     * @param position the position
     */
    getIndexFromPos(path: string, position: ws.Position): number {
        var script = this.projectScripts.get(path);
        if (script) {
            return script.lineMap.getPosition(position.line, position.ch)
        }
        return -1;
    }
    
    
    /**
     * return a positon in line/char from an index
     * @param path the path of the file
     * @param index the index
     */
    indexToPosition(path: string, index: number): ws.Position {
        var script = this.projectScripts.get(path);
        if (script) {
            var tsPosition = script.getLineAndColForPositon(index);
            return {
                ch: tsPosition.character,
                line: tsPosition.line
            }
        }
        return null;
    }

    /**
     * retrive all files dependant of a given file
     * @param path the path of the given file
     */
    getFilesDependantOfFile(path: string): string[] {
        switch(this.getProjectFileKind(path)) {
            case ProjectFileKind.NONE:
                return null;
            default:
                return this.references.has(path) ? this.references.get(path).keys : null;
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
        this.collectFiles().then(() => {
            this.compilationSettings =  this.createCompilationSettings();
            if (!this.compilationSettings.noLib) {
                this.addDefaultLibrary();
            }
            this.createLanguageService();
            this.workingSet.files.forEach((path: string) => {
                var script = this.projectScripts.get(path);
                if (script) {
                    script.isOpen = true;
                }
            });
            this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
            this.workingSet.documentEdited.add(this.documentEditedHandler);
            this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
            this.services.forEach(service => service.run(true, null));
            this.initialized = true;
        },() => { 
            //TODO handle errors;
            console.log('Errors in collecting project files');
        });
    }
    
    
    //-------------------------------
    //  Scripts manipulation
    //-------------------------------
    
    /**
     * retrive files content for path described in the config
     */
    private collectFiles(): JQueryPromise<void> {
        this.projectScripts = new collections.StringMap<script.ScriptInfo>();
        this.missingFiles = new collections.StringSet();
        this.references = new collections.StringMap<collections.StringSet>();
        return this.fileSystem.getProjectFiles().then((paths: string[]) => {
            var promises: JQueryPromise<any>[] = [];
            paths.forEach(path => {
                if (this.isProjectSourceFile(path)) {
                    var promise = this.addFile(path, false);
                    promises.push()
                }
            });
            return $.when.apply($,promises);
        });
    }
    
  
    
    /**
     * add a file to the project
     * @param path
     */
    private addFile(path: string, notify = true): JQueryPromise<void>  {
        if (!this.projectScripts.has(path)) {
            this.projectScripts.set(path, null);
            this.fileSystem.readFile(path).then((content: string) => {
                var promises: JQueryPromise<any>[] = [];
                this.missingFiles.remove(path);
                this.projectScripts.set(path, this.createScriptInfo(path, content));
                if (notify) {
                    this.notifyFileAdded(path);
                }
                this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                    promises.push(this.addFile(referencedPath));
                    this.addReference(path, referencedPath);
                });
                return $.when.apply($,promises);
            },() => {
                this.projectScripts.delete(path);
                if (!this.getReferencedOrImportedFiles(path) !== null) {
                    this.missingFiles.add(path);
                }
            });
        }
        return null;
    }
    
    /**
     * remove a file from the project
     * @param path
     */
    private removeFile(path: string) {
        if (this.projectScripts.has(path)) {
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                this.removeReference(path, referencedPath);
            });
            if (this.references.has(path) && this.references.get(path).keys.length > 0) {
                this.missingFiles.add(path);
            }   
            this.projectScripts.delete(path);
            this.notifyFileDeleted(path);
        }
    }
    
    /**
     * update a project file
     * @param path
     */
    private updateFile(path: string) {
        this.fileSystem.readFile(path).then((content: string) => {
            var oldPathMap: { [path: string]: boolean } = {};
            this.getReferencedOrImportedFiles(path).forEach(path => oldPathMap[path] = true);
            this.projectScripts.get(path).updateContent(content);
            this.notifyFileUpdated(path);
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                delete oldPathMap[referencedPath];
                if (!this.projectScripts.has(referencedPath)) {
                    this.addFile(referencedPath);
                    this.addReference(path, referencedPath);
                }
            });
            
            Object.keys(oldPathMap).forEach((referencedPath: string) => {
                this.removeReference(path, referencedPath);
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
    
    /**
     * create a scriptInfo
     * @param path
     * @param content
     */
    private createScriptInfo(path: string, content: string): script.ScriptInfo {
         return new script.ScriptInfo(path, content)
    }
    
    //-------------------------------
    //  References
    //-------------------------------
    
    /**
     * for a given file retrives the file referenced or imported by this file
     * @param path
     */
    private getReferencedOrImportedFiles(path: string): string[] {
        if (!this.projectScripts.has(path)) {
            return []
        }
        var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, new script.ScriptSnapshot(this.projectScripts.get(path)));
        return preProcessedFileInfo.referencedFiles.map(fileReference => {
            return PathUtils.makePathAbsolute(fileReference.path, path);
        }).concat(preProcessedFileInfo.importedFiles.map(fileReference => {
            return PathUtils.makePathAbsolute(fileReference.path + '.ts', path);
        }));
    }
    
    /**
     * add a reference 
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private addReference(path: string, referencedPath: string) {
        if (!this.references.has(referencedPath)) {
            this.references.set(referencedPath, new collections.StringSet());
        }
        this.references.get(referencedPath).add(path)
    }
    
    /**
     * remove a reference
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private removeReference(path: string, referencedPath: string) {
        var fileRefs = this.references.get(referencedPath);
        if (!fileRefs) {
            this.removeFile(referencedPath);
        }
        fileRefs.remove(path);
        if (fileRefs.keys.length === 0) {
            this.references.delete(referencedPath);
            this.removeFile(referencedPath);
        }   
    }
    
    
    
    //-------------------------------
    //  TypeScript Objects
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
    /**
     * create the language service according to the file
     */
    private createLanguageService(): void {
        this.languageServiceHost = new language.LanguageServiceHost(this.compilationSettings, this.projectScripts);
        this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
    }
    
    //-------------------------------
    //  Default Library
    //-------------------------------
    
    /**
     * add the default library
     */
    private addDefaultLibrary() {
        return this.addFile(utils.DEFAULT_LIB_LOCATION)
    }
    
    
    /**
     * add the default library
     */
    private removeDefaultLibrary() {
        this.removeFile(utils.DEFAULT_LIB_LOCATION)
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
    
    /**
     * handle changes in the fileSystem
     */
    private filesChangeHandler = (changeRecords: fs.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fs.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.path) || this.missingFiles.has(record.path)) {
                        this.addFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.DELETE:
                    if (this.projectScripts.has(record.path)) {
                        this.removeFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.UPDATE:
                    if (this.projectScripts.has(record.path)) {
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
                    if (this.projectScripts.has(path)) {
                        this.projectScripts.get(path).isOpen = true;
                    }
                });
                break;
            case ws.WorkingSetChangeKind.REMOVE:
                changeRecord.paths.forEach((path: string) => {
                    if (this.projectScripts.has(path)) {
                        this.projectScripts.get(path).isOpen = false;
                        this.updateFile(path);
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
            if (this.projectScripts.has(record.path)) {
                if (!record.from || !record.to) {
                    this.updateFile(record.path);
                }
                var minChar = this.getIndexFromPos(record.path, record.from),
                    limChar = this.getIndexFromPos(record.path, record.to);
                
                this.projectScripts.get(record.path).editContent(minChar, limChar, record.text);
            }
        });
    }
}


