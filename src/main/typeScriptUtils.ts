// the location of the default library
export var DEFAULT_LIB_LOCATION: string;

// minimatch instance
export var minimatch: MiniMatchStatic; 

var PROJECT_CONFIG_FILE_NAME = ".brackets-typescript";

/**
 * helper function that return true if the given path is a bracketsTypescript config file
 * @param path
 */
export function isTypeScriptProjectConfigFile(path: string): boolean {
    return path && path.substr(path.lastIndexOf('/') + 1, path.length) === PROJECT_CONFIG_FILE_NAME;
}

