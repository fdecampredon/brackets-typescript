/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    "use strict";
    require(
        [
            "third_party/typescriptServices",
            "third_party/minimatch",
            "bin/main/typeScriptUtils",
            "text!config.json"
        ],
        function (typescript, minimatch, typeScriptUtils, configText) {
            var AppInit = brackets.getModule('utils/AppInit'),
                config = JSON.parse(configText);
            
            typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('third_party/lib.d.ts');
            typeScriptUtils.minimatch = minimatch;
            
            require(["bin/main/index"], function (init) {
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


