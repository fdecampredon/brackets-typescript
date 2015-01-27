//   Copyright 2013-2014 François de Campredon
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

'use strict';

import Promise = require('bluebird');
import ps = require('typescript-project-services');
import TypeScriptProjectConfig = ps.TypeScriptProjectConfig;
import ts = require('typescript');
import utils = require('./utils');
import collections = require('./collections');
import signal = require('./signal');


type RawConfig = {
    //---------------------------------------------
    //  Brackets-Typescript Specific settings
    //---------------------------------------------
    
    /**
     * Array of minimatch pattern string representing 
     * sources of a project
     */
    sources?: string[];
    
    /**
     * Path to an alternative typescriptCompiler
     */
    typescriptPath?: string;
    
    
    //---------------------------------------------
    //  Compiler Settings
    //---------------------------------------------
    
    /**
     * should the project include the default typescript library file
     */
    noLib?: boolean;
    /**
     * 
     */
    target?: string;
    
    /**
     * Specify ECMAScript target version: 'ES3' (default), or 'ES5'
     */
    module?: string;
    
    /**
     * Specifies the location where debugger should locate TypeScript files instead of source locations.
     */
    sourceRoot?: string;
    
    /**
     *  Warn on expressions and declarations with an implied 'any' type.
     */
    noImplicitAny?: boolean;

}


var targetMap: {[index: string]: ts.ScriptTarget } = {
    es3 : ts.ScriptTarget.ES3,
    es5 : ts.ScriptTarget.ES5,
    es6 : ts.ScriptTarget.ES6,
    latest : ts.ScriptTarget.Latest
}

var moduleMap: {[index: string]: ts.ModuleKind } = {
    commonjs : ts.ModuleKind.CommonJS,
    amd : ts.ModuleKind.AMD,
    none : ts.ModuleKind.None
}

/**
 * helper function that valid a config file
 * @param config the config object to validate
 */
function validateTypeScriptProjectConfig(config: RawConfig): boolean {
    if (!config) {
        return false;
    }    
    if (config.target && ['es3', 'es5', 'es6', 'latest' ].indexOf(config.target.toLowerCase()) === -1) {
        return false;
    }
    if (config.module && ['none', 'amd', 'commonjs'].indexOf(config.module.toLowerCase()) === -1) {
        return false;
    }
    if (config.sourceRoot && typeof config.sourceRoot !== 'string') {
        return false;
    }
    if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(pattern => typeof pattern === 'string')) {
        return false;
    }
    return true;
}


/**
 * Default configuration for typescript project
 */
var typeScriptProjectConfigDefault: RawConfig = {
    noLib: false,
    target: 'es3',
    module: 'none',
    noImplicitAny: false
};



function rawConfigToTypeScriptProjectConfig(raw: RawConfig): TypeScriptProjectConfig {
    
    var compilerOptions: ts.CompilerOptions = {
        noLib: raw.noLib,
        target: targetMap[raw.target],
        module: moduleMap[raw.module],
        sourceRoot: raw.sourceRoot,
        noImplicitAny: raw.noImplicitAny
    };
    
    
    return { 
        sources: raw.sources, 
        typescriptPath: raw.typescriptPath,
        compilationSettings: compilerOptions
    };
}


/**
 * Implementation of the ITypescriptPreferenceManager
 */
class TypescriptPreferenceManager {
    /**
     * @prama prefManager brackets PreferenceManager module
     */
    constructor(
        private prefManager: brackets.PreferencesManager
    ) {
        this.prefManager.on('change', this.preferenceChangedHandler);
    }
    
    /**
     * map projectId => config of collected config file
     */
    private projectConfigs: collections.StringMap<TypeScriptProjectConfig>;
    
    configChanged = new signal.Signal<void>();
    
    /**
     * @return a Promise resolving to and map projectId <=> project config
     * corresponding to the typescript section in project preference
     */
    getProjectsConfig() {
        if (!this.projectConfigs) {
            this.projectConfigs = this.retrieveProjectsConfig();
        }
        return Promise.cast(this.projectConfigs.toObject()); 
    }

    /**
     * A signal notifying when preferences might have changed
     */
    dispose() {
        this.configChanged.clear();
    }
    
    /**
     * retrieve project configs from preferences
     */
    private retrieveProjectsConfig(): collections.StringMap<TypeScriptProjectConfig>  {
        var result = new collections.StringMap<TypeScriptProjectConfig>();
        
        var data = this.prefManager.get('typescript', this.prefManager.CURRENT_PROJECT);
        if (!data) {
            return result;
        }
        
        var configs: any;

        if (data.hasOwnProperty('projects')) {
            var projects: any = data.projects;
            delete data.projects;
            if (typeof projects !== 'object') {
                return result;    
            }
            configs = Object.keys(projects).reduce((configs: any, id: any) => {
                var project = projects[id];
                if (typeof project === 'object') {
                    configs[id] = utils.assign({}, data, project);
                }
                return configs;
            }, {});
        } else {
            configs = {
                default: data
            };
        }
        
        Object.keys(configs).forEach(projectId => {
            var config: TypeScriptProjectConfig = utils.assign({ },  typeScriptProjectConfigDefault, configs[projectId]);
            if (!validateTypeScriptProjectConfig(config)) {
                console.warn('invalid config file for brackets-typescript config file')
            } else {
                result.set(projectId, rawConfigToTypeScriptProjectConfig(config));
            }
        });
        
        return result;
    }
    
    
    /**
     * handle change in preferences
     */
    private preferenceChangedHandler = (e: any, data: any) => {
        if (data && Array.isArray(data.ids) && data.ids.indexOf('typescript') !== -1) {
            this.projectConfigs = null;
            this.configChanged.dispatch();
        }
    };
}

export = TypescriptPreferenceManager;
