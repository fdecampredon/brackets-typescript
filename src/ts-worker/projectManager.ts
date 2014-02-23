import Rx = require('rx');
import path = require('path');
import fs = require('../commons/fileSystem');
import ws = require('../commons/workingSet');
import TypeScriptProjectConfig = require('../commons/config');
import collections = require('../commons/collections');
import tsUtils = require('../commons/typeScriptUtils');
import TypeScriptProject = require('./project');
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
class TypeScriptProjectManager {
    
    //-------------------------------
    //  constructor
    //-------------------------------
    
    /**
     * @param fileSystem the fileSystem wrapper used by the projectManager
     * @param workingSet the working set wrapper used by the projectManager
     */
    constructor(
        private fileSystem: fs.FileSystem, 
        private workingSet: ws.WorkingSet,
        private defaultTypeScriptLocation: string,
        private projectFactory: (
            baseDirectory: string,
            config: TypeScriptProjectConfig, 
            fileSystem: fs.FileSystem,
            workingSet: ws.WorkingSet,
            servicesFactory: Services.TypeScriptServicesFactory,
            defaultLibLocation: string
        )  => TypeScriptProject
    ) {}
    
    //-------------------------------
    //  variables
    //-------------------------------
    
    /**
     * a map containing the projects 
     */
    private projectMap = new collections.StringMap<TypeScriptProject[]>();
    
    private disposable: Rx.IDisposable;
    
    //-------------------------------
    // Public methods
    //------------------------------- 
    
    
    /**
     * initialize the project manager
     */
    init(): void {
        this.createProjects();
        this.disposable = this.fileSystem.projectFilesChanged.subscribe(this.filesChangeHandler);
    }
    
    
    /**
     * dispose the project manager
     */
    dispose(): void {
        this.disposable.dispose(); 
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
        projects.some(tsProjects  => {
            return tsProjects.some(tsProject => {
                if (tsProject.getProjectFileKind(path) === TypeScriptProject.ProjectFileKind.SOURCE) {
                    project = tsProject;
                    return true;
                }
            })     
        });
        
        if (!project) {
            projects.some(tsProjects  => {
                return tsProjects.some(tsProject => {
                    if (tsProject.getProjectFileKind(path) === TypeScriptProject.ProjectFileKind.REFERENCE) {
                        project = tsProject;
                        return true;
                    }
                })     
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
                .filter(tsUtils.isTypeScriptProjectConfigFile)
                .forEach(this.createProjectsFromFile, this);     
        });
    }
    
    /**
     * dispose every projects created by the project Manager
     */
    private disposeProjects():void {
        var projectMap = this.projectMap;
        projectMap.keys.forEach(path =>  {
            projectMap.get(path).forEach(project => project.dispose())
        });
        this.projectMap.clear();
    }
    
    /**
     * for a given config file create a project
     * 
     * @param configFilePath the config file path
     */
    private createProjectsFromFile(configFilePath: string) {
        this.retrieveConfig(configFilePath).then(configs => {
            if (configs.length === 0) {
                this.projectMap.delete(configFilePath);
                return;
            }
            
            var projects: TypeScriptProject[];
            if (!this.projectMap.has(configFilePath)) {
                projects = [];
                this.projectMap.set(configFilePath, projects);
            } else {
                projects = this.projectMap.get(configFilePath);
            }
            
            configs.forEach( (config: TypeScriptProjectConfig, index: number) => {
                var project = projects[index];
                if (project) {
                    project.dispose();
                } 
                projects[index] = this.createProjectFromConfig(configFilePath, config);
            });
        });
    }
    
    /**
     * for given validated config and config file path create a project
     * 
     * @param configFilePath the config file path
     * @param config the config created from the file
     */
    private createProjectFromConfig(configFile: string, config : TypeScriptProjectConfig): TypeScriptProject {
        if (config) {
            //todo
            /*var project = this.projectFactory(path.directory(configFilePath), config, this.fileSystem, this.workingSet, null);
            project.init(this.servicesFactory.map(serviceFactory => serviceFactory(project)));
            return project;*/
            return null;
        } 
    }


    
    /**
     * try to create a config from a given config file path
     * validate the config file, then add default values if needed
     * 
     * @param configFilePath
     */
    private retrieveConfig(configFilePath: string): JQueryPromise<TypeScriptProjectConfig[]> {
        return this.fileSystem.readFile(configFilePath).then((content: string) => {
            var data : any;
            try {
                data =  JSON.parse(content);
            } catch(e) {
                //TODO logging strategy
                console.log('invalid json for brackets-typescript config file: ' + configFilePath);
            }
            
            if (!data) {
                return [];
            }
            
            var configs : TypeScriptProjectConfig[];
            if (Array.isArray(data)) {
                configs = data;
            } else {
                configs = [data]
            }
            
            return configs.map(config => {
                if(config) {
                    for (var property in typeScriptProjectConfigDefault) {
                        if (!config.hasOwnProperty(property)) {
                            config[property] = typeScriptProjectConfigDefault[property]
                        }
                    }
                    //todo
                    /*if(!utils.validateTypeScriptProjectConfig(config)) {
                        config = null;
                    }*/
                }
                return config; 
            }).filter(config => !!config);
        });
    }
    
    
    //-------------------------------
    //  Events Handler
    //------------------------------- 
    
    
    /**
     * handle changes in the file system, update / delete / create project accordingly
     */
    private filesChangeHandler = (changeRecords: fs.FileChangeRecord[]) => {
        changeRecords.forEach(record => {
            if (record.kind === fs.FileChangeKind.RESET) {
                //reinitialize the projects if file system reset
                this.disposeProjects();
                this.createProjects();
                return false;
            } else if (tsUtils.isTypeScriptProjectConfigFile(record.path)) {
                switch (record.kind) { 
                    // a config file has been deleted detele the project
                    case fs.FileChangeKind.DELETE:
                        if (this.projectMap.has(record.path)) {
                            this.projectMap.get(record.path).forEach(project => {
                                project.dispose();
                            })
                            this.projectMap.delete(record.path);
                        }
                        break;
                        
                    // a config file has been created create a new project
                    case fs.FileChangeKind.ADD:
                        this.createProjectsFromFile(record.path);
                        break;
                        
                    case fs.FileChangeKind.UPDATE:
                        this.createProjectsFromFile(record.path);
                        break;
                }
            }
            return true;
        }); 
    }
}

export = TypeScriptProjectManager;