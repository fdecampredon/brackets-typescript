import fileUtils = require('./utils/fileUtils');


var BRACKETS_TYPESCRIPT_FILE_NAME = '.brackets-typescript'; 


export class TypeScriptProjectManager {
    private fileSystemObserver: fileUtils.IFileSystemObserver;
    private fileInfosResolver:() => JQueryPromise<brackets.FileInfo[]>;
    private typeScriptProjectFactory: (directory:string, config: TypeScriptProjectConfig) => TypeScriptProject;
    private reader: (path:String) => JQueryPromise<string>;
    private projectMap: { [path:string]:TypeScriptProject }
    
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
        this.projectMap[path] = config && this.typeScriptProjectFactory(PathUtils.directory(path), config);
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
    dispose(): void {
    }
    
    update(config: TypeScriptProjectConfig): void {
    }
}


export function newTypeScriptProject(config: TypeScriptProjectConfig): TypeScriptProject {
    return null;
}