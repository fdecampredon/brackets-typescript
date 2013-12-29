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
import projectNamespace = require('./project');
import collections = require('../commons/collections');

//alias
import TypeScriptProjectConfig = projectNamespace.TypeScriptProjectConfig;
import ITypeScriptProject = projectNamespace.ITypeScriptProject;
import ProjectServiceFactory = projectNamespace.ProjectServiceFactory;

//alias this way to force projectNamespace in amd dependencies 0.9.5 bug
var ProjectFileKind = projectNamespace.ProjectFileKind;




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
        private workingSet: ws.IWorkingSet,
        private projectFactory: (
                    baseDir: string, 
                    config: TypeScriptProjectConfig, 
                    fileSystem: fs.IFileSystem, 
                    workingSet: ws.IWorkingSet
                ) => ITypeScriptProject
    ) {}
    
    //-------------------------------
    //  variables
    //-------------------------------
    
    /**
     * a map containing the projects 
     */
    private projectMap = new collections.StringMap<ITypeScriptProject[]>();
    
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
    getProjectForFile(path: string): ITypeScriptProject {
        var projects = this.projectMap.values,
            project : ITypeScriptProject = null;
        //first we check for a project that have tha file as source 
        projects.some(tsProjects  => {
            return tsProjects.some(tsProject => {
                if (tsProject.getProjectFileKind(path) === ProjectFileKind.SOURCE) {
                    project = tsProject;
                    return true;
                }
            })     
        });
        
        if (!project) {
            projects.some(tsProjects  => {
                return tsProjects.some(tsProject => {
                    if (tsProject.getProjectFileKind(path) === ProjectFileKind.REFERENCE) {
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
                .filter(utils.isTypeScriptProjectConfigFile)
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
            
            var projects: ITypeScriptProject[];
            if (!this.projectMap.has(configFilePath)) {
                projects = [];
                this.projectMap.set(configFilePath, projects);
            } else {
                projects = this.projectMap.get(configFilePath);
            }
            
            configs.forEach( (config: TypeScriptProjectConfig, index: number) => {
                var project = projects[index];
                if (project) {
                    project.update(config)
                } else {
                     projects[index] = this.createProjectFromConfig(configFilePath, config);
                }
            });
        });
    }
    
    /**
     * for given validated config and config file path create a project
     * 
     * @param configFilePath the config file path
     * @param config the config created from the file
     */
    private createProjectFromConfig(configFilePath: string, config : TypeScriptProjectConfig) {
        if (config) {
            var project = this.projectFactory(PathUtils.directory(configFilePath), config, this.fileSystem, this.workingSet);
            project.init(this.servicesFactory.map(serviceFactory => serviceFactory(project)));
            return project;
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
            }).filter(config => !!config);
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

