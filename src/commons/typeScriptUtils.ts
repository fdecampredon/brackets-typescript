import TypeScriptProjectConfig = require('./config');

var PROJECT_CONFIG_FILE_NAME: string = '.brackets-typescript';

/**
 * helper function that return true if the given path is a bracketsTypescript config file
 * @param path
 */
export function isTypeScriptProjectConfigFile(path: string): boolean {
    return path && path.substr(path.lastIndexOf('/') + 1, path.length) === PROJECT_CONFIG_FILE_NAME;
}


/**
 * helper function that valid a config file
 * @param config the config file to validate
 */
export function validateTypeScriptProjectConfig(config : TypeScriptProjectConfig): boolean {
    if (!config) {
        return false;
    }    
    if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(pattern => typeof pattern === 'string')) {
        return false;
    }
    if (config.buildAutomaticly && !(config.outDir && typeof config.outDir === 'string') && 
            !(config.outFile && typeof config.outFile === 'string')) {
        return false
    }
    return true;
}


/**
 * Default configuration for typescript project
 */
export var typeScriptProjectConfigDefault: TypeScriptProjectConfig = {
    buildAutomaticly: false,
    
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
