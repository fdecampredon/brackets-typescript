import fileUtils = require('./utils/fileUtils');
import coreService = require('./typescript/coreService');
import script = require('./typescript/script');


var BRACKETS_TYPESCRIPT_FILE_NAME = '.brackets-typescript'; 

export interface TypeScriptProjectFactory {
    (   
        baseDirectory: string,
        config: TypeScriptProjectConfig, 
        fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>,
        fileSystemObserver: fileUtils.IFileSystemObserver, 
        reader: (path:String) => JQueryPromise<string>
    ): TypeScriptProject
}


export class TypeScriptProjectManager {
    private fileSystemObserver: fileUtils.IFileSystemObserver;
    private fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>;
    private typeScriptProjectFactory: TypeScriptProjectFactory;
    private reader: (path:String) => JQueryPromise<string>;
    private projectMap: { [path:string]: TypeScriptProject }
    
    constructor(fileSystemObserver: fileUtils.IFileSystemObserver, 
                fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>, 
                typeScriptProjectFactory: (directory:string,config: TypeScriptProjectConfig) => TypeScriptProject,
                reader: (path:String) => JQueryPromise<string> ) {
        
        this.fileSystemObserver = fileSystemObserver;
        this.fileInfosResolver = fileInfosResolver;
        this.typeScriptProjectFactory = typeScriptProjectFactory;
        this.reader = reader;
    }
    
    init(): void {
        this.createProjects();
        this.fileSystemObserver.add(this.filesChangeHandler);
    }
    
    
    dispose(): void {
        this.fileSystemObserver.remove(this.filesChangeHandler);
        this.disposeProjects();
    }
    
    private createProjects():void {
        this.projectMap = {}; 
        this.fileInfosResolver().then((fileInfos: brackets.FileInfo[]) => {
            fileInfos.filter(fileInfo => fileInfo.name === BRACKETS_TYPESCRIPT_FILE_NAME).forEach(this.createProjectFromFile, this);     
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
    
    private createProjectFromFile(fileInfo: brackets.FileInfo) {
        this.retrieveConfig(fileInfo).then( config => this.createProjectFromConfig(config, fileInfo.fullPath));
    }
    
    private createProjectFromConfig(config : TypeScriptProjectConfig, path: string) {
        if (config) {
            this.projectMap[path] = this.typeScriptProjectFactory(PathUtils.directory(path), config, 
                                                                        this.fileInfosResolver, this.fileSystemObserver, this.reader);
        } else {
            this.projectMap[path] = null;
        }
    }
    
    private retrieveConfig(fileInfo: brackets.FileInfo): JQueryPromise<TypeScriptProjectConfig> {
        return this.reader(fileInfo.fullPath).then((content: string) => {
            var config : TypeScriptProjectConfig;
            try {
                config =  JSON.parse(content);
            } catch(e) {
                //TODO logging strategy
                console.log('invalid json for brackets-typescript config file: ' + fileInfo.fullPath);
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
    
    private filesChangeHandler = (changeRecords: fileUtils.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fileUtils.FileChangeKind.DELETE:
                    if (this.projectMap[record.file.fullPath]) {
                        this.projectMap[record.file.fullPath].dispose();
                        delete this.projectMap[record.file.fullPath];
                    }
                    break;
                case fileUtils.FileChangeKind.ADD:
                    this.createProjectFromFile(record.file);
                    break;
                case fileUtils.FileChangeKind.UPDATE:
                    this.retrieveConfig(record.file).then((config : TypeScriptProjectConfig) => {
                        if (config) {
                            if(this.projectMap[record.file.fullPath]) {
                                this.projectMap[record.file.fullPath].update(config);
                            } else {
                                this.createProjectFromConfig(config, record.file.fullPath);
                            }
                        }
                    });
                    break;
                case fileUtils.FileChangeKind.REFRESH:
                    this.disposeProjects();
                    this.createProjects();
                    break;
            }
        }); 
    }
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
}

export var typeScriptProjectConfigDefault: TypeScriptProjectConfig = {
    compileOnSave: false,
    
    propagateEnumConstants: false,
    removeComments: true,
    allowAutomaticSemicolonInsertion : true,
    noLib: false,
    target: 'es3',
    module: 'none',
    mapSource: false,
    declaration: false,
    useCaseSensitiveFileResolution: false,
    allowBool: false,
    allowImportModule: false
}



export class TypeScriptProject {
    
    private baseDirectory: string;
    private config: TypeScriptProjectConfig; 
    private fileSystemObserver: fileUtils.IFileSystemObserver;
    private reader: (path:String) => JQueryPromise<string>;
    private fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>;
    
    private files: { [path: string]: string };
    private references: { [path: string]:  { [path: string]: boolean } };
    private missingFiles: { [path: string]: boolean };
    
    constructor(baseDirectory: string,
                config: TypeScriptProjectConfig, 
                fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>,
                fileSystemObserver: fileUtils.IFileSystemObserver, 
                reader: (path:String) => JQueryPromise<string>) {
        this.baseDirectory = baseDirectory;
        this.config = config;
        this.fileSystemObserver = fileSystemObserver;
        this.reader = reader;
        this.fileInfosResolver = fileInfosResolver;
        this.collectFiles();
        this.fileSystemObserver.add(this.filesChangeHandler);
    }
    
    getFiles() {
        return $.extend({}, this.files);
    }
    
    dispose(): void {
        this.fileSystemObserver.remove(this.filesChangeHandler);
    }
    
    update(config: TypeScriptProjectConfig): void {
        this.config = config;
        this.collectFiles();
    }
    
    private collectFiles(): void {
        this.files = {};
        this.missingFiles = {};
        this.references = {}
        this.fileInfosResolver().then((fileInfos: brackets.FileInfo[]) => {
            fileInfos.filter((fileInfo) => this.isProjectSourceFile(fileInfo.fullPath)).forEach(fileInfo => this.addFile(fileInfo.fullPath)); 
        });
    }
    
    private getReferencedOrImportedFiles(path: string): string[] {
        if (!this.files[path]) {
            return []
        }
        var preProcessedFileInfo = coreService.getPreProcessedFileInfo(path, script.getScriptSnapShot(path, this.files[path]));
        return preProcessedFileInfo.referencedFiles.concat(preProcessedFileInfo.importedFiles).map(fileRefence => {
            return PathUtils.makePathAbsolute(fileRefence.path, path);
        });
    }
    
    private addFile(path: string) {
        if (!this.files.hasOwnProperty(path)) {
            this.files[path] = null;
            this.reader(path).then((content: string) => {
                if (content === null || content === undefined) {
                    this.missingFiles[path] = true;
                    delete this.files[path];
                    return;
                }
                delete this.missingFiles[path];
                this.files[path] = content;
                this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                    this.addFile(referencedPath);
                    if (!this.references[referencedPath]) {
                        this.references[referencedPath] = {};
                    }
                    this.references[referencedPath][path] = true;
                });
            });
        }
    }
    
    private removeFile(path: string) {
        if (this.files.hasOwnProperty(path)) {
            this.getReferencedOrImportedFiles(path).forEach((referencedPath: string) => {
                var fileRefs = this.references[referencedPath]
                if (!fileRefs) {
                    this.removeFile(referencedPath);
                }
                delete fileRefs[path];
                if (Object.keys(fileRefs).length === 0) {
                    delete this.references[referencedPath];
                    this.removeFile(referencedPath);
                }
            });
            if (this.references[path] && Object.keys(this.references[path])) {
                this.missingFiles[path] = true;
            }   
            delete this.files[path];
        }
    }
    
    private isProjectSourceFile(path: string): boolean {
        path = PathUtils.makePathRelative(path, this.baseDirectory);
        return this.config.sources.some(pattern => minimatch(path, pattern));
    }
    
    
    private filesChangeHandler = (changeRecords: fileUtils.ChangeRecord[]) => {
        changeRecords.forEach(record => {
            switch (record.kind) { 
                case fileUtils.FileChangeKind.ADD:
                    if (this.isProjectSourceFile(record.file.fullPath) || this.missingFiles[record.file.fullPath]) {
                        this.addFile(record.file.fullPath);
                    }
                    break;
                case fileUtils.FileChangeKind.DELETE:
                    if (this.files.hasOwnProperty(record.file.fullPath)) {
                        this.removeFile(record.file.fullPath);
                    }
                    break;
               /* case fileUtils.FileChangeKind.DELETE:
                    if (this.projectMap[record.file.fullPath]) {
                        this.projectMap[record.file.fullPath].dispose();
                        delete this.projectMap[record.file.fullPath];
                    }
                    break;
                case fileUtils.FileChangeKind.ADD:
                    this.createProjectFromFile(record.file);
                    break;
                case fileUtils.FileChangeKind.UPDATE:
                    this.retrieveConfig(record.file).then((config : TypeScriptProjectConfig) => {
                        if (config) {
                            if(this.projectMap[record.file.fullPath]) {
                                this.projectMap[record.file.fullPath].update(config);
                            } else {
                                this.createProjectFromConfig(config, record.file.fullPath);
                            }
                        }
                    });
                    break;
                case fileUtils.FileChangeKind.REFRESH:
                    this.disposeProjects();
                    this.createProjects();
                    break;*/
            }
        });
    }
}


export function newTypeScriptProject(baseDirectory: string,
                                    config: TypeScriptProjectConfig, 
                                    fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>,
                                    fileSystemObserver: fileUtils.IFileSystemObserver, 
                                    reader: (path:String) => JQueryPromise<string>): TypeScriptProject {
    return new TypeScriptProject(baseDirectory, config, fileInfosResolver, fileSystemObserver, reader);
}