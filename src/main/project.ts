import fs = require('./fileSystem');
import ws = require('./workingSet');
import coreService = require('./typescript/coreService');
import script = require('./typescript/script');
import language = require('./typescript/language');
import utils = require('./typeScriptUtils');
import Services = TypeScript.Services;



//--------------------------------------------------------------------------
//
//  TypeScriptProjectManager
//
//--------------------------------------------------------------------------

/**
 * describe a factory used by the project manager to create project
 */
export interface TypeScriptProjectFactory {
    (   
        baseDirectory: string,
        config: TypeScriptProjectConfig, 
        fileSystemService: fs.IFileSystem,
        workingSet: ws.IWorkingSet
    ): TypeScriptProject
}

/**
 * The main facade class of the extentions, responsible to create / destroy / update projects
 * by observing config files in the files of the opened brackets folder
 */
export class TypeScriptProjectManager {
    
    
    /**
     * @param fileSystem the fileSystem wrapper used by the projectManager
     * @param workingSet the working set wrapper used by the projectManager
     * @param typeScriptProjectFactory the factory used by the projectManager to create TypeScriptProject
     */
    constructor(
        private fileSystem: fs.IFileSystem, 
        private workingSet: ws.IWorkingSet,
        private typeScriptProjectFactory: TypeScriptProjectFactory
    ) {}
    
    /**
     * a map containing the projects 
     */
    private projectMap: { [path:string]: TypeScriptProject };
    
    
    /**
     * initialize the project manager
     */
    init(): void {
        this.createProjects();
        this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
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
        //first we check for a project that have tha file as source 
        for (var configPath in this.projectMap) {
            if (this.projectMap[configPath].getProjectFileKind(path) === ProjectFileKind.SOURCE) {
                return this.projectMap[configPath];
            }
        }
        
        //then we check for a project that just reference the file
        for (var configPath in this.projectMap) {
            if (this.projectMap[configPath].getProjectFileKind(path) === ProjectFileKind.REFERENCE) {
                return this.projectMap[configPath];
            }
        }
        
        //TODO return a kind of "single file project" if no project are found
        return null;
    }
    
    /**
     * find bracketsTypescript config files and create a project for each file founds
     */
    private createProjects():void {
        this.projectMap = {}; 
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
        var projectMap = this.projectMap ;
        for (var path in projectMap) {
            if (projectMap.hasOwnProperty(path) && projectMap[path]) {
                projectMap[path].dispose();
            }
        }
        this.projectMap = {};
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
            this.projectMap[configFilePath] = this.typeScriptProjectFactory(PathUtils.directory(configFilePath), 
                                                                                config, this.fileSystem, this.workingSet);
        } else {
            this.projectMap[configFilePath] = null;
        }
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
                for (var property in typeScriptProjectConfigDefault) {
                    if(typeScriptProjectConfigDefault.hasOwnProperty(property) && !config.hasOwnProperty(property)) {
                        (<any>config)[property] = (<any>typeScriptProjectConfigDefault)[config];
                    }
                }
                if(!validateTypeScriptProjectConfig(config)) {
                    config = null;
                }
            }
            return config; 
        });
    }
    
    /**
     * handle changes in the file system, update / delete / create project accordingly
     */
    private filesChangeHandler = (changeRecords: fs.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            if (record.kind === fs.FileChangeKind.REFRESH) {
                //reinitialize the projects if refrehsh
                this.disposeProjects();
                this.createProjects();
            } else if (utils.isTypeScriptProjectConfigFile(record.path)) {
                
                switch (record.kind) { 
                    
                    // a config file has been deleted detele the project
                    case fs.FileChangeKind.DELETE:
                        if (this.projectMap[record.path]) {
                            this.projectMap[record.path].dispose();
                            delete this.projectMap[record.path];
                        }
                        break;
                        
                    // a config file has been created create a new project
                    case fs.FileChangeKind.ADD:
                        this.createProjectFromFile(record.path);
                        break;
                        
                    case fs.FileChangeKind.UPDATE:
                        this.retrieveConfig(record.path).then((config : TypeScriptProjectConfig) => {
                            if (config) {
                                if(this.projectMap[record.path]) {
                                    //config file has been updated create the project
                                    this.projectMap[record.path].update(config);
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
            
        }); 
    }
}



/**
 * helper function that valid a config file
 * @param config the config file to validate
 */
export function validateTypeScriptProjectConfig(config : TypeScriptProjectConfig): boolean {
    if (!config) {
        return false;
    }    
    if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(sourceItem => typeof sourceItem === 'string')) {
        return false;
    }
    if ( !(config.outDir && typeof config.outDir === 'string') && !(config.outFile && typeof config.outFile === 'string')) {
        return false
    }
    return true;
}


/**
 * default config
 */
export var typeScriptProjectConfigDefault: TypeScriptProjectConfig = {
    compileOnSave: false,
    
    propagateEnumConstants: false,
    removeComments: false,
    allowAutomaticSemicolonInsertion : true,
    noLib: false,
    target: 'es3',
    module: 'none',
    mapSource: false,
    declaration: false,
    useCaseSensitiveFileResolution: false,
    allowBool: false,
    allowImportModule: false,
    noImplicitAny: false
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
 * 
 */
export interface LanguageServiceHostFactory {
    (settings: TypeScript.CompilationSettings, files:  { [path: string]: string }): language.LanguageServiceHost;
}


export enum ProjectFileKind {
    NONE,
    SOURCE,
    REFERENCE
}

export class TypeScriptProject {
    
    private baseDirectory: string;
    private config: TypeScriptProjectConfig; 
    private fileSystemService: fs.IFileSystem;
    private workingSet: ws.IWorkingSet;
    private languageServiceHostFactory: LanguageServiceHostFactory
    
    private files: { [path: string]: string };
    private references: { [path: string]:  { [path: string]: boolean } };
    private missingFiles: { [path: string]: boolean };
    private languageServiceHost: language.ILanguageServiceHost;
    private languageService: Services.ILanguageService;
    
    constructor(baseDirectory: string,
                config: TypeScriptProjectConfig, 
                fileSystemService: fs.IFileSystem,
                workingSet: ws.IWorkingSet,
                languageServiceHostFactory: LanguageServiceHostFactory) {
        this.baseDirectory = baseDirectory;
        this.config = config;
        this.fileSystemService = fileSystemService;
        this.workingSet = workingSet;
        this.languageServiceHostFactory = languageServiceHostFactory;
        this.collectFiles().then(() => this.createLanguageServiceHost(), function() {
            console.log("fuck");
                    });
        
        this.fileSystemService.projectFilesChanged.add(this.filesChangeHandler);
        this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
        this.workingSet.documentEdited.add(this.documentEditedHandler);
    }
    
    getLanguageService(): Services.ILanguageService {
        return this.languageService;
    }
    
    getLanguageServiceHost(): language.ILanguageServiceHost {
        return this.languageServiceHost;
    }
    
    getFiles() {
        return $.extend({}, this.files);
    }
    
    dispose(): void {
        this.fileSystemService.projectFilesChanged.remove(this.filesChangeHandler);
        this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
        this.workingSet.documentEdited.remove(this.documentEditedHandler);
    }
    
    update(config: TypeScriptProjectConfig): void {
        this.config = config;
        this.collectFiles();
    }
    
    getProjectFileKind(path: string): ProjectFileKind {
        if (this.files.hasOwnProperty(path)) {
            return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE :  ProjectFileKind.REFERENCE;
        } else {
            return ProjectFileKind.NONE
        }
    }
    
    private collectFiles(): JQueryPromise<void> {
        this.files = {};
        this.missingFiles = {};
        this.references = {}
        return this.fileSystemService.getProjectFiles().then((paths: string[]) => {
            var promises: JQueryPromise<any>[] = [];
            paths
                .filter(path => this.isProjectSourceFile(path))
                .forEach(path => promises.push(this.addFile(path)));
            return $.when.apply($,promises);
        });
    }
    
    private getReferencedOrImportedFiles(path: string): string[] {
        if (!this.files[path]) {
            return []
        }
        var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, script.getScriptSnapShot(path, this.files[path]));
        return preProcessedFileInfo.referencedFiles.map(fileRefence => {
            return PathUtils.makePathAbsolute(fileRefence.path, path);
        }).concat(preProcessedFileInfo.importedFiles.map(fileRefence => {
            return PathUtils.makePathAbsolute(fileRefence.path + '.ts', path);
        }));
    }
    
    private addFile(path: string): JQueryPromise<void>  {
        if (!this.files.hasOwnProperty(path)) {
            this.files[path] = null;
            return this.fileSystemService.readFile(path).then((content: string) => {
                var promises: JQueryPromise<any>[] = [];
                if (content === null || content === undefined) {
                    this.missingFiles[path] = true;
                    delete this.files[path];
                    return null;
                }
                delete this.missingFiles[path];
                this.files[path] = content;
                this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                    promises.push(this.addFile(referencedPath));
                    this.addReference(path, referencedPath);
                });
                if (this.languageServiceHost) {
                    this.languageServiceHost.addScript(path, content);
                }
                return $.when.apply($,promises);
            });
        }
        return null;
    }
    
    private removeFile(path: string) {
        if (this.files.hasOwnProperty(path)) {
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                this.removeReference(path, referencedPath);
            });
            if (this.references[path] && Object.keys(this.references[path]).length > 0) {
                this.missingFiles[path] = true;
            }   
            if (this.languageServiceHost) {
                this.languageServiceHost.removeScript(path);
            }
            delete this.files[path];
        }
    }
    
    private updateFile(path: string) {
        this.fileSystemService.readFile(path).then((content: string) => {
            var oldPathMap: { [path: string]: boolean } = {};
            this.getReferencedOrImportedFiles(path).forEach(path => oldPathMap[path] = true);
            this.files[path] = content;
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                delete oldPathMap[referencedPath];
                if (!this.files.hasOwnProperty(referencedPath)) {
                    this.addFile(referencedPath);
                    this.addReference(path, referencedPath);
                }
            });
            
            Object.keys(oldPathMap).forEach((referencedPath: string) => {
                this.removeReference(path, referencedPath);
            });
            
            if (this.languageServiceHost) {
                this.languageServiceHost.updateScript(path, content);
            }
        });
    }
    
    
    private addReference(path: string, referencedPath: string) {
        if (!this.references[referencedPath]) {
            this.references[referencedPath] = {};
        }
        this.references[referencedPath][path] = true;
    }
    
    private removeReference(path: string, referencedPath: string) {
        var fileRefs = this.references[referencedPath];
        if (!fileRefs) {
            this.removeFile(referencedPath);
        }
        delete fileRefs[path];
        if (Object.keys(fileRefs).length === 0) {
            delete this.references[referencedPath];
            this.removeFile(referencedPath);
        }   
    }
    
    private isProjectSourceFile(path: string): boolean {
        path = PathUtils.makePathRelative(path, this.baseDirectory);
        return this.config.sources.some(pattern => utils.minimatch(path, pattern));
    }
    
    
    private filesChangeHandler = (changeRecords: fs.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fs.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.path) || this.missingFiles[record.path]) {
                        this.addFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.DELETE:
                    if (this.files.hasOwnProperty(record.path)) {
                        this.removeFile(record.path);
                    }
                    break;
                case fs.FileChangeKind.UPDATE:
                    if (this.files.hasOwnProperty(record.path)) {
                        this.updateFile(record.path);
                    }
                    break;
            }
        });
    }
    
    private workingSetChangedHandler = (changeRecord:  ws.ChangeRecord) => {
        switch (changeRecord.kind) { 
            case ws.WorkingSetChangeKind.ADD:
                changeRecord.paths.forEach((path: string) => {
                    if (this.files.hasOwnProperty(path)) {
                        this.languageServiceHost.setScriptIsOpen(path, true);
                    }
                });
                break;
            case ws.WorkingSetChangeKind.REMOVE:
                changeRecord.paths.forEach((path: string) => {
                    if (this.files.hasOwnProperty(path)) {
                        this.languageServiceHost.setScriptIsOpen(path, false);
                        this.updateFile(path);
                    }
                });
                break;
        }
    }
    
    private documentEditedHandler = (records: ws.DocumentChangeDescriptor[]) => {
        records.forEach((record: ws.DocumentChangeDescriptor) => {
            if (this.files.hasOwnProperty(record.path)) {
                if (!record.from || !record.to) {
                    this.updateFile(record.path);
                }
                var minChar = this.getIndexFromPos(record.path, record.from),
                    limChar = this.getIndexFromPos(record.path, record.to);
                
                this.languageServiceHost.editScript(record.path, minChar, limChar, record.text);
            }
        });
    }
    
    private getIndexFromPos(path: string, position: ws.Position) {
        return this.languageServiceHost.lineColToPosition(path, position.line, position.ch);
    }
    
    private createLanguageServiceHost(): void {
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
   
        this.languageServiceHost = this.languageServiceHostFactory(compilationSettings, this.getFiles());
        if (!compilationSettings.noLib) {
            this.addDefaultLibrary();
        }
        this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
        
        this.workingSet.files.forEach((path: string) => {
            if (this.files.hasOwnProperty(path)) {
                this.languageServiceHost.setScriptIsOpen(path, true);
            }
        });
        
        
    }
    
    private addDefaultLibrary() {
        this.addFile(utils.DEFAULT_LIB_LOCATION)
    }
}


export function typeScriptProjectFactory (   
                                        baseDirectory: string,
                                        config: TypeScriptProjectConfig, 
                                        fileSystemService: fs.IFileSystem,
                                        workingSet: ws.IWorkingSet
                                    ): TypeScriptProject {
    return new TypeScriptProject(baseDirectory, config, fileSystemService, workingSet, 
                                            (settings: TypeScript.CompilationSettings, files:  { [path: string]: string }) => {
                                                return new language.LanguageServiceHost(settings, files);
                                            });
}


