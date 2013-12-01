import fs = require('./fileSystem');
import ws = require('./workingSet');
import coreService = require('./typescript/coreService');
import script = require('./typescript/script');
import language = require('./typescript/language');
import utils = require('./typeScriptUtils');
import collections = require('./utils/collections');
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
     * @param typeScriptProjectFactory the factory used by the projectManager to create TypeScriptProject
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
            this.projectMap.set(configFilePath, this.newProject(PathUtils.directory(configFilePath), config));
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
 * class representing a typescript project, responsible of synchronizing 
 * languageServiceHost with the file system
 */
export class TypeScriptProject {
    
   
   
    
    constructor(
        private baseDirectory: string,
        private config: TypeScriptProjectConfig, 
        private fileSystem: fs.IFileSystem,
        private workingSet: ws.IWorkingSet
    ) {
        this.collectFiles().then(() => {
            this.createLanguageServiceHost();
            this.workingSet.files.forEach((path: string) => {
                if (this.files.hasOwnProperty(path)) {
                    this.languageServiceHost.setScriptIsOpen(path, true);
                }
            });
            this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
            this.workingSet.documentEdited.add(this.documentEditedHandler);
            this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);
        }, () => console.log('todo'));
    }
    
    
    /**
     * Map path to content
     */
    private files: { [path: string]: string };
    
    /**
     * store file references
     */
    private references: { [path: string]: collections.StringSet };
    
    /**
     * a set containing path of file referenced but not found
     */
    private missingFiles: collections.StringSet;
    
    /**
     * the language service associated to this project
     */
    private languageService: Services.ILanguageService;
    
    /**
     * return the language service associated to this project
     */
    getLanguageService(): Services.ILanguageService {
        return this.languageService;
    }
    
    /**
     * the language service host associated to this project
     */
    private languageServiceHost: language.ILanguageServiceHost;
    
    /**
     * return the language service hosts associated to this project
     */
    getLanguageServiceHost(): language.ILanguageServiceHost {
        return this.languageServiceHost;
    }
    
    /**
     * return a Map path to content
     */
    getFiles(): { [path: string]: string } {
        return $.extend({}, this.files);
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
        this.collectFiles();
    }
    
    /**
     * for a given path, give the relation between the project an the associated file
     * @param path
     */
    getProjectFileKind(path: string): ProjectFileKind {
        if (this.files.hasOwnProperty(path)) {
            return this.isProjectSourceFile(path) ? ProjectFileKind.SOURCE :  ProjectFileKind.REFERENCE;
        } else {
            return ProjectFileKind.NONE
        }
    }
    
    /**
     * retrive files content for path described in the config
     */
    private collectFiles(): JQueryPromise<void> {
        this.files = {};
        this.missingFiles = new collections.StringSet();
        this.references = {}
        return this.fileSystem.getProjectFiles().then((paths: string[]) => {
            var promises: JQueryPromise<any>[] = [];
            paths
                .filter(path => this.isProjectSourceFile(path))
                .forEach(path => promises.push(this.addFile(path)));
            return $.when.apply($,promises);
        });
    }
    
    /**
     * for a given file retrives the file referenced or imported by this file
     * @param path
     */
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
    
    /**
     * add a file to the project
     * @param path
     */
    private addFile(path: string): JQueryPromise<void>  {
        if (!this.files.hasOwnProperty(path)) {
            this.files[path] = null;
            return this.fileSystem.readFile(path).then((content: string) => {
                var promises: JQueryPromise<any>[] = [];
                if (content === null || content === undefined) {
                    this.missingFiles.add(path);
                    delete this.files[path];
                    return null;
                }
                this.missingFiles.remove(path);
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
    
    /**
     * remove a file from the project
     * @param path
     */
    private removeFile(path: string) {
        if (this.files.hasOwnProperty(path)) {
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                this.removeReference(path, referencedPath);
            });
            if (this.references[path] && this.references[path].keys.length > 0) {
                this.missingFiles.add(path);
            }   
            if (this.languageServiceHost) {
                this.languageServiceHost.removeScript(path);
            }
            delete this.files[path];
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
    
    /**
     * add a reference 
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private addReference(path: string, referencedPath: string) {
        if (!this.references[referencedPath]) {
            this.references[referencedPath] = new collections.StringSet();
        }
        this.references[referencedPath].add(path)
    }
    
    /**
     * remove a reference
     * @param path the path of the file referencing anothe file
     * @param referencedPath the path of the file referenced
     */
    private removeReference(path: string, referencedPath: string) {
        var fileRefs = this.references[referencedPath];
        if (!fileRefs) {
            this.removeFile(referencedPath);
        }
        fileRefs.remove(path);
        if (fileRefs.keys.length === 0) {
            delete this.references[referencedPath];
            this.removeFile(referencedPath);
        }   
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
    
    /**
     * handle changes in the workingSet
     */
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
    
    /**
     * handle document edition
     */
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
    
    /**
     * return an index from a positon in line/char
     * @param path the path of the file
     * @param position the position
     */
    private getIndexFromPos(path: string, position: ws.Position) {
        return this.languageServiceHost.lineColToPosition(path, position.line, position.ch);
    }
    
    /**
     * create the language service according to the file
     */
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
   
        this.languageServiceHost = new language.LanguageServiceHost(compilationSettings, this.getFiles());
        if (!compilationSettings.noLib) {
            this.addDefaultLibrary();
        }
        this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
 
        
    }
    
    /**
     * add the default library
     */
    private addDefaultLibrary() {
        this.addFile(utils.DEFAULT_LIB_LOCATION)
    }
}

