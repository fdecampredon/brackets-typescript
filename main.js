/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';
    require(
        [
            'third_party/typescriptServices',
            'third_party/minimatch',
            'text!config.json'
        ],
        function (typescript, minimatch, configText) {
            var AppInit = brackets.getModule('utils/AppInit'),
                config = JSON.parse(configText);
            
            var bin = config.isDebug ? 'built/local/main/' : 'bin/main/';
            
            require([ bin + 'typeScriptUtils', bin + 'index'], function (typeScriptUtils, init) {
                typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('third_party/lib.d.ts');
                typeScriptUtils.minimatch = minimatch;
                //in debug mode avoid using AppInit that catch errors ...
                if (config.isDebug) {
                    init(config);
                } else {
                    AppInit.appReady(function () {
                        init(config);
                    });
                }
            });
        }
    );
});
