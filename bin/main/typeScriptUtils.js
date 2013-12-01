define(["require", "exports"], function(require, exports) {
    

    exports.DEFAULT_LIB_LOCATION;

    exports.minimatch;

    var PROJECT_CONFIG_FILE_NAME = ".brackets-typescript";

    function isTypeScriptProjectConfigFile(path) {
        return path && path.substr(path.lastIndexOf('/') + 1, path.length) === PROJECT_CONFIG_FILE_NAME;
    }
    exports.isTypeScriptProjectConfigFile = isTypeScriptProjectConfigFile;

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
