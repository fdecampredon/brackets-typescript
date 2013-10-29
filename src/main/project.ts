import fileSystem = require('./fileSystem');
import ws = require('./workingSet');
import coreService = require('./typescript/coreService');
import script = require('./typescript/script');
import language = require('./typescript/language');

var BRACKETS_TYPESCRIPT_FILE_NAME = '.brackets-typescript'; 

export interface TypeScriptProjectFactory {
    (   
        baseDirectory: string,
        config: TypeScriptProjectConfig, 
        fileSystemService: fileSystem.IFileSystemService,
        workingSet: ws.IWorkingSet
    ): TypeScriptProject
}


export class TypeScriptProjectManager {
    private fileSystemService: fileSystem.IFileSystemService;
    private typeScriptProjectFactory: TypeScriptProjectFactory;
    private projectMap: { [path:string]: TypeScriptProject };
    private workingSet: ws.IWorkingSet;
    
    constructor(fileSystemService: fileSystem.IFileSystemService, 
                workingSet: ws.IWorkingSet,
                typeScriptProjectFactory: TypeScriptProjectFactory) {
        this.fileSystemService = fileSystemService;
        this.typeScriptProjectFactory = typeScriptProjectFactory;
        this.workingSet = workingSet;
    }
    
    init(): void {
        this.createProjects();
        this.fileSystemService.projectFilesChanged.add(this.filesChangeHandler);
    }
    
    
    dispose(): void {
        this.fileSystemService.projectFilesChanged.remove(this.filesChangeHandler);
        this.disposeProjects();
    }
    
    
    getProjectForFile(path: string): TypeScriptProject {
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
    }
    
    private createProjects():void {
        this.projectMap = {}; 
        this.fileSystemService.getProjectFiles().then((paths: string[]) => {
            paths
                .filter(isTypeScriptProjectConfigFile)
                .forEach(this.createProjectFromFile, this);     
        });
    }
    
    private disposeProjects():void {
        var projectMap = this.projectMap ;
        for (var path in projectMap) {
            if (projectMap.hasOwnProperty(path) && projectMap[path]) {
                projectMap[path].dispose();
            }
        }
        this.projectMap = {};
    }
    
    private createProjectFromFile(configFilePath: string) {
        this.retrieveConfig(configFilePath).then( config => this.createProjectFromConfig(configFilePath, config));
    }
    
    private createProjectFromConfig(configFilePath: string, config : TypeScriptProjectConfig) {
        if (config) {
            this.projectMap[configFilePath] = this.typeScriptProjectFactory(PathUtils.directory(configFilePath), 
                                                                                config, this.fileSystemService, this.workingSet);
        } else {
            this.projectMap[configFilePath] = null;
        }
    }
    
    private retrieveConfig(configFilePath: string): JQueryPromise<TypeScriptProjectConfig> {
        return this.fileSystemService.readFile(configFilePath).then((content: string) => {
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
    
    private filesChangeHandler = (changeRecords: fileSystem.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            if (record.kind === fileSystem.FileChangeKind.REFRESH) {
                this.disposeProjects();
                this.createProjects();
            } else if (isTypeScriptProjectConfigFile(record.path)) {
                switch (record.kind) { 
                    case fileSystem.FileChangeKind.DELETE:
                        if (this.projectMap[record.path]) {
                            this.projectMap[record.path].dispose();
                            delete this.projectMap[record.path];
                        }
                        break;
                    case fileSystem.FileChangeKind.ADD:
                        this.createProjectFromFile(record.path);
                        break;
                    case fileSystem.FileChangeKind.UPDATE:
                        this.retrieveConfig(record.path).then((config : TypeScriptProjectConfig) => {
                            if (config) {
                                if(this.projectMap[record.path]) {
                                    this.projectMap[record.path].update(config);
                                } else {
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


function isTypeScriptProjectConfigFile(path: string): boolean {
    return path && path.substr(path.lastIndexOf('/') + 1, path.length) === BRACKETS_TYPESCRIPT_FILE_NAME;
}


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
    allowBool?: boolean;
    allowImportModule?: boolean;
    noImplicitAny?: boolean;
}

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
    private fileSystemService: fileSystem.IFileSystemService;
    private workingSet: ws.IWorkingSet;
    private languageServiceHostFactory: LanguageServiceHostFactory
    
    private files: { [path: string]: string };
    private references: { [path: string]:  { [path: string]: boolean } };
    private missingFiles: { [path: string]: boolean };
    private languageServiceHost: language.ILanguageServiceHost;
    private languageService: Services.ILanguageService;
    
    constructor(baseDirectory: string,
                config: TypeScriptProjectConfig, 
                fileSystemService: fileSystem.IFileSystemService,
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
            var promises = [];
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
                var promises = [];
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
        return this.config.sources.some(pattern => minimatch(path, pattern));
    }
    
    
    private filesChangeHandler = (changeRecords: fileSystem.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fileSystem.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.path) || this.missingFiles[record.path]) {
                        this.addFile(record.path);
                    }
                    break;
                case fileSystem.FileChangeKind.DELETE:
                    if (this.files.hasOwnProperty(record.path)) {
                        this.removeFile(record.path);
                    }
                    break;
                case fileSystem.FileChangeKind.UPDATE:
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
                var minChar = this.getIndexFromPos(record.path, record.from),
                    limChar = this.getIndexFromPos(record.path, record.to)
                this.languageServiceHost.editScript(record.path, minChar, limChar, record.text)
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
        compilationSettings.allowBool = this.config.allowBool;
        compilationSettings.allowModuleKeywordInExternalModuleReference = this.config.allowImportModule;
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
        this.languageService = new Services.TypeScriptServicesFactory().createPullLanguageService(this.languageServiceHost);
        
        this.workingSet.files.forEach((path: string) => {
            if (this.files.hasOwnProperty(path)) {
                this.languageServiceHost.setScriptIsOpen(path, true);
            }
        });
    }
}


export function typeScriptProjectFactory (   
                                        baseDirectory: string,
                                        config: TypeScriptProjectConfig, 
                                        fileSystemService: fileSystem.IFileSystemService,
                                        workingSet: ws.IWorkingSet
                                    ): TypeScriptProject {
    return new TypeScriptProject(baseDirectory, config, fileSystemService, workingSet, 
                                            (settings: TypeScript.CompilationSettings, files:  { [path: string]: string }) => {
                                                return new language.LanguageServiceHost(settings, files);
                                            });
}


