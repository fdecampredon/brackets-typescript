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
        if (config.compileOnSave && !(config.outDir && typeof config.outDir === 'string') && !(config.outFile && typeof config.outFile === 'string')) {
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
