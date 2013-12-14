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


import project = require('./project');


/** 
 * the location of the default library
 */
export var DEFAULT_LIB_LOCATION: string;

/**
 * minimatch instance
 */ 
export var minimatch: MiniMatchStatic; 

/**
 * @private
 */
var PROJECT_CONFIG_FILE_NAME = ".brackets-typescript";

/**
 * helper function that return true if the given path is a bracketsTypescript config file
 * @param path
 */
export function isTypeScriptProjectConfigFile(path: string): boolean {
    return path && path.substr(path.lastIndexOf('/') + 1, path.length) === PROJECT_CONFIG_FILE_NAME;
}


/**
 * helper function that return true if the given path is a typescript declaration file
 * @param path
 */
export function isDeclarationFile(path: string): boolean {
    return /.*\.d\.ts$/.test(path);
}



/**
 * helper function that valid a config file
 * @param config the config file to validate
 */
export function validateTypeScriptProjectConfig(config : project.TypeScriptProjectConfig): boolean {
    if (!config) {
        return false;
    }    
    if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(sourceItem => typeof sourceItem === 'string')) {
        return false;
    }
    if (config.compileOnSave && !(config.outDir && typeof config.outDir === 'string') && !(config.outFile && typeof config.outFile === 'string')) {
        return false
    }
    return true;
}


/**
 * default config for a typescript project
 */
export var typeScriptProjectConfigDefault: project.TypeScriptProjectConfig = {
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