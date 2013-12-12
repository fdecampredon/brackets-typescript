define(["require", "exports"], function(require, exports) {
    /**
    * the location of the default library
    */
    exports.DEFAULT_LIB_LOCATION;

    /**
    * minimatch instance
    */
    exports.minimatch;

    /**
    * @private
    */
    var PROJECT_CONFIG_FILE_NAME = ".brackets-typescript";

    /**
    * helper function that return true if the given path is a bracketsTypescript config file
    * @param path
    */
    function isTypeScriptProjectConfigFile(path) {
        return path && path.substr(path.lastIndexOf('/') + 1, path.length) === PROJECT_CONFIG_FILE_NAME;
    }
    exports.isTypeScriptProjectConfigFile = isTypeScriptProjectConfigFile;

    /**
    * helper function that return true if the given path is a typescript declaration file
    * @param path
    */
    function isDeclarationFile(path) {
        return /.*\.d\.ts$/.test(path);
    }
    exports.isDeclarationFile = isDeclarationFile;

    /**
    * helper function that valid a config file
    * @param config the config file to validate
    */
    function validateTypeScriptProjectConfig(config) {
        if (!config) {
            return false;
        }
        if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(function (sourceItem) {
            return typeof sourceItem === 'string';
        })) {
            return false;
        }
        if (!(config.outDir && typeof config.outDir === 'string') && !(config.outFile && typeof config.outFile === 'string')) {
            return false;
        }
        return true;
    }
    exports.validateTypeScriptProjectConfig = validateTypeScriptProjectConfig;

    /**
    * default config for a typescript project
    */
    exports.typeScriptProjectConfigDefault = {
        compileOnSave: false,
        propagateEnumConstants: false,
        removeComments: false,
        allowAutomaticSemicolonInsertion: true,
        noLib: false,
        target: 'es3',
        module: 'none',
        mapSource: false,
        declaration: false,
        useCaseSensitiveFileResolution: false,
        allowBool: false,
        allowImportModule: false,
        noImplicitAny: false
    };
});
